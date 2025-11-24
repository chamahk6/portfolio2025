const buttons = document.querySelectorAll('.info-nav button');
const panels = document.querySelectorAll('.info-panel');

buttons.forEach((btn) => {
  btn.addEventListener('click', () => {
    // Reset classes
    buttons.forEach(b => b.classList.remove('active'));
    panels.forEach(p => p.classList.add('hidden'));

    // Active clicked button and show panel
    btn.classList.add('active');
    const targetId = btn.dataset.target;
    document.getElementById(targetId).classList.remove('hidden');
  });
});

const skillsButtons = document.querySelectorAll('.skills-nav button');
const skillsPanels = document.querySelectorAll('.skills-panel');

skillsButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    // Retirer tous les panels et désactiver les boutons
    skillsButtons.forEach(b => b.classList.remove('active'));
    skillsPanels.forEach(p => p.classList.add('hidden'));

    // Activer le bouton cliqué
    btn.classList.add('active');

    // Afficher le panel cible
    const targetId = btn.dataset.target;
    const targetPanel = document.getElementById(targetId);
    if (targetPanel) {
      targetPanel.classList.remove('hidden');
    }
  });
});
