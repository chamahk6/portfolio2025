class RSSReader {
  constructor() {
    this.feeds = [
      {
        name: "CNIL - Actualités",
        url: "https://www.cnil.fr/fr/rss.xml",
        type: "cnil",
        lang: "fr"
      },
      {
        name: "CERT-FR - Alertes",
        url: "https://www.cert.ssi.gouv.fr/feed/",
        type: "cert",
        lang: "fr"
      },
      {
        name: "ANSSI - Actualités",
        url: "https://cyber.gouv.fr/rss.xml",
        type: "anssi",
        lang: "fr"
      }
    ];
    
    this.articles = [];
    this.maxArticles = 12; // Pour afficher jusqu'à 4 articles par source
    this.currentFilter = 'all';
  }

  async fetchFeed(feed) {
    try {
      // TENTATIVE 1 : Utilisation de l'API rss2json (très fiable pour les flux RSS)
      const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      
      if (data.status === 'ok' && data.items.length > 0) {
        return this.parseRss2Json(data.items, feed.name, feed.type);
      } else {
        throw new Error('rss2json n\'a pas renvoyé de données valides.');
      }
    } catch (error) {
      console.warn(`Tentative 1 échouée pour ${feed.name}. Essai avec proxy alternatif...`, error);
      
      // TENTATIVE 2 : Utilisation de allorigins comme plan B (raw XML)
      try {
        const proxyUrl = 'https://api.allorigins.win/get?url=';
        const response2 = await fetch(`${proxyUrl}${encodeURIComponent(feed.url)}`);
        
        if (!response2.ok) throw new Error(`HTTP error! status: ${response2.status}`);
        
        const data2 = await response2.json();
        return this.parseRawXML(data2.contents, feed.name, feed.type);
      } catch (error2) {
        console.error(`Échec total pour ${feed.name}:`, error2);
        // Si tout échoue (ex: pas de connexion), on met des données par défaut pertinentes
        return this.getFallbackArticles(feed.name, feed.type);
      }
    }
  }

  // Parseur pour la structure renvoyée par l'API rss2json
  parseRss2Json(items, sourceName, sourceType) {
    const articles = [];
    const maxItems = Math.min(items.length, 4); // Prend les 4 articles les plus récents
    
    for (let i = 0; i < maxItems; i++) {
      const item = items[i];
      articles.push({
        title: this.cleanTitle(item.title || 'Sans titre'),
        link: item.link || '#',
        description: this.cleanDescription(item.description || item.content || ''),
        date: this.formatDate(item.pubDate),
        source: sourceName,
        type: sourceType
      });
    }
    return articles;
  }

  // Parseur pour la structure brute XML (Plan B)
  parseRawXML(xmlText, sourceName, sourceType) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const items = xmlDoc.querySelectorAll('item');
      const articles = [];
      const maxItems = Math.min(items.length, 4);
      
      for (let i = 0; i < maxItems; i++) {
        const item = items[i];
        const title = item.querySelector('title')?.textContent || 'Sans titre';
        const link = item.querySelector('link')?.textContent || '#';
        const description = item.querySelector('description')?.textContent || '';
        const pubDate = item.querySelector('pubDate')?.textContent || '';
        
        articles.push({
          title: this.cleanTitle(title),
          link,
          description: this.cleanDescription(description),
          date: this.formatDate(pubDate),
          source: sourceName,
          type: sourceType
        });
      }
      return articles;
    } catch (error) {
      console.error('Erreur de parsing XML:', error);
      return this.getFallbackArticles(sourceName, sourceType);
    }
  }

  // Données de secours de dernière chance (si API/réseau planté)
  getFallbackArticles(sourceName, sourceType) {
    const fallbackArticles = {
      'cnil': [
        {
          title: "Accéder aux dernières actualités de la CNIL",
          link: "https://www.cnil.fr/fr/actualites",
          description: "Impossible de charger le flux RSS en temps réel. Cliquez ici pour voir les dernières actualités juridiques directement sur le site de la CNIL.",
          date: this.formatDate(new Date()),
          source: sourceName,
          type: sourceType
        }
      ],
      'cert': [
        {
          title: "Accéder aux dernières alertes du CERT-FR",
          link: "https://www.cert.ssi.gouv.fr/alerte/",
          description: "Impossible de charger le flux RSS en temps réel. Cliquez ici pour consulter les dernières alertes de sécurité.",
          date: this.formatDate(new Date()),
          source: sourceName,
          type: sourceType
        }
      ],
      'anssi': [
        {
          title: "Accéder aux dernières actualités de l'ANSSI",
          link: "https://cyber.gouv.fr/actualites",
          description: "Impossible de charger le flux RSS en temps réel. Cliquez ici pour consulter les dernières publications sur cyber.gouv.fr.",
          date: this.formatDate(new Date()),
          source: sourceName,
          type: sourceType
        }
      ]
    };
    return fallbackArticles[sourceType] || [];
  }

  cleanTitle(title) {
    return title.length > 100 ? title.substring(0, 100) + '...' : title;
  }

  cleanDescription(description) {
    const div = document.createElement('div');
    div.innerHTML = description;
    let text = div.textContent || div.innerText || '';
    // Nettoyage des balises HTML parasites restantes
    text = text.replace(/<[^>]*>?/gm, '');
    return text.length > 150 ? text.substring(0, 150) + '...' : text;
  }

  formatDate(dateString) {
    if (!dateString) return 'Récemment';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return 'Récemment';
    }
  }

  async loadAllFeeds() {
    const container = document.getElementById('rss-articles');
    
    try {
      if (container) {
        container.innerHTML = '<div class="loading">📡 Récupération des articles officiels en temps réel...</div>';
      }
      
      const promises = this.feeds.map(feed => this.fetchFeed(feed));
      const results = await Promise.allSettled(promises);
      
      this.articles = results
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => result.value)
        // Trier par date la plus récente
        .sort((a, b) => new Date(b.date) - new Date(a.date)) 
        .slice(0, this.maxArticles);
      
      this.displayArticles();
      this.setupFilterButtons();
      
    } catch (error) {
      console.error('Error loading feeds:', error);
      if (container) {
        container.innerHTML = '<div class="error">Erreur lors du chargement des actualités</div>';
      }
    }
  }

  displayArticles(filteredArticles = null) {
    const container = document.getElementById('rss-articles');
    if (!container) return; // Sécurité si la div n'existe pas sur la page en cours

    const articlesToShow = filteredArticles || this.articles;
    
    if (articlesToShow.length === 0) {
      container.innerHTML = '<div class="no-articles">Aucune actualité disponible</div>';
      return;
    }
    
    const articlesHTML = articlesToShow.map(article => `
      <div class="article-card" data-type="${article.type}">
        <a href="${article.link}" target="_blank" rel="noopener noreferrer" class="article-title">
          ${article.title}
        </a>
        <p class="article-description">${article.description}</p>
        <div class="article-meta">
          <span class="article-source">${article.source}</span>
          <span class="article-date">${article.date}</span>
        </div>
        <div class="article-tags">
          <span class="article-tag ${article.type}">
            ${this.getTypeLabel(article.type)}
          </span>
        </div>
      </div>
    `).join('');
    
    container.innerHTML = articlesHTML;
  }

  getTypeLabel(type) {
    const labels = {
      'cert': '🛡️ CERT-FR',
      'cnil': '⚖️ CNIL - Juridique',
      'anssi': '⚡ ANSSI'
    };
    return labels[type] || type;
  }

  setupFilterButtons() {
    const buttons = document.querySelectorAll('.filter-btn');
    
    buttons.forEach(btn => {
      // Éviter d'ajouter l'événement plusieurs fois
      btn.replaceWith(btn.cloneNode(true));
    });

    const newButtons = document.querySelectorAll('.filter-btn');
    newButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        newButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        this.currentFilter = btn.dataset.filter;
        this.filterArticles();
      });
    });
  }

  filterArticles() {
    const articles = document.querySelectorAll('.article-card');
    
    if (this.currentFilter === 'all') {
      articles.forEach(article => {
        article.style.display = 'block';
      });
    } else {
      articles.forEach(article => {
        if (article.dataset.type === this.currentFilter) {
          article.style.display = 'block';
        } else {
          article.style.display = 'none';
        }
      });
    }
  }
}

// Initialisation quand la page est chargée
document.addEventListener('DOMContentLoaded', () => {
  // On ne charge le flux RSS que si la div d'affichage est présente (pour la séparation en plusieurs pages)
  if (document.getElementById('rss-articles')) {
    const rssReader = new RSSReader();
    rssReader.loadAllFeeds();
    
    // Recharger toutes les heures
    setInterval(() => {
      rssReader.loadAllFeeds();
    }, 60 * 60 * 1000);
  }
});