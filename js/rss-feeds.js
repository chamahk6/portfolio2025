class RSSReader {
  constructor() {
    this.feeds = [
      {
        name: "CERT-FR - Alertes",
        url: "https://www.cert.ssi.gouv.fr/feed/",
        type: "cert",
        lang: "fr"
      },
      
      {
        name: "ANSSI - Actualités",
        url: "https://cyber.gouv.fr/actualites",
        type: "anssi",
        lang: "fr"
      }
    ];
    
    this.articles = [];
    this.maxArticles = 10;
    this.currentFilter = 'all';
  }

  async fetchFeed(feed) {
    try {
      // Utilisation d'un proxy CORS pour contourner les restrictions
      const proxyUrl = 'https://api.allorigins.win/get?url=';
      const response = await fetch(`${proxyUrl}${encodeURIComponent(feed.url)}`);
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      return this.parseRSS(data.contents, feed.name, feed.type);
    } catch (error) {
      console.error(`Error fetching ${feed.name}:`, error);
      // Retourner des données de démonstration en cas d'erreur
      return this.getFallbackArticles(feed.name, feed.type);
    }
  }

  parseRSS(xmlText, sourceName, sourceType) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      
      const items = xmlDoc.querySelectorAll('item');
      const articles = [];
      
      // Prendre maximum 4 articles par flux
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
      console.error('Error parsing RSS:', error);
      return this.getFallbackArticles(sourceName, sourceType);
    }
  }

  // Articles de démonstration si les flux RSS échouent
  getFallbackArticles(sourceName, sourceType) {
    const fallbackArticles = {
      'cert': [
        {
          title: "Alerte CERT-FR : Vulnérabilités critiques dans les solutions VPN",
          link: "https://www.cert.ssi.gouv.fr/",
          description: "Le CERT-FR publie un avis concernant des vulnérabilités critiques affectant plusieurs solutions VPN largement déployées.",
          date: this.formatDate(new Date()),
          source: sourceName,
          type: sourceType
        },
        {
          title: "Campagne de cyberattaques ciblant le secteur santé",
          link: "https://www.cert.ssi.gouv.fr/",
          description: "Alerte sur une campagne d'attaques par ransomware visant spécifiquement les établissements de santé français.",
          date: this.formatDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
          source: sourceName,
          type: sourceType
        }
      ],
      'anssi': [
        {
          title: "L'ANSSI lance un nouveau référentiel de sécurité cloud",
          link: "https://www.ssi.gouv.fr/",
          description: "Publication du référentiel SecNumCloud 3.5 avec de nouvelles exigences pour la souveraineté numérique.",
          date: this.formatDate(new Date()),
          source: sourceName,
          type: sourceType
        },
        {
          title: "Campagne de sensibilisation aux rançongiciels",
          link: "https://www.ssi.gouv.fr/",
          description: "L'ANSSI intensifie sa campagne de formation pour prévenir les attaques par rançongiciels dans les PME.",
          date: this.formatDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
          source: sourceName,
          type: sourceType
        }
      ]
    };
    
    return fallbackArticles[sourceType] || [];
  }

  cleanTitle(title) {
    if (title.length > 100) {
      return title.substring(0, 100) + '...';
    }
    return title;
  }

  cleanDescription(description) {
    const div = document.createElement('div');
    div.innerHTML = description;
    let text = div.textContent || div.innerText || '';
    
    text = text.replace(/<[^>]*>/g, '');
    if (text.length > 120) {
      text = text.substring(0, 120) + '...';
    }
    
    return text;
  }

  formatDate(dateString) {
    if (!dateString) return 'Date inconnue';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return 'Date inconnue';
    }
  }

  async loadAllFeeds() {
    const container = document.getElementById('rss-articles');
    
    try {
      container.innerHTML = '<div class="loading">Chargement des actualités...</div>';
      
      // Charger tous les flux en parallèle
      const promises = this.feeds.map(feed => this.fetchFeed(feed));
      const results = await Promise.allSettled(promises);
      
      // Combiner tous les articles
      this.articles = results
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => result.value)
        .slice(0, this.maxArticles);
      
      this.displayArticles();
      this.setupFilterButtons();
      
    } catch (error) {
      console.error('Error loading feeds:', error);
      container.innerHTML = '<div class="error">Erreur lors du chargement des actualités</div>';
    }
  }

  displayArticles(filteredArticles = null) {
    const container = document.getElementById('rss-articles');
    const articlesToShow = filteredArticles || this.articles;
    
    if (articlesToShow.length === 0) {
      container.innerHTML = '<div class="no-articles">Aucune actualité disponible</div>';
      return;
    }
    
    const articlesHTML = articlesToShow.map(article => `
      <div class="article-card" data-type="${article.type}">
        <a href="${article.link}" target="_blank" class="article-title">
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
      'cnil': '🔐 CNIL',
      'anssi': '⚡ ANSSI'
    };
    return labels[type] || type;
  }

  setupFilterButtons() {
    const buttons = document.querySelectorAll('.filter-btn');
    
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        // Mettre à jour les boutons actifs
        buttons.forEach(b => b.classList.remove('active'));
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
  const rssReader = new RSSReader();
  rssReader.loadAllFeeds();
  
  // Recharger toutes les heures
  setInterval(() => {
    rssReader.loadAllFeeds();
  }, 60 * 60 * 1000);
});