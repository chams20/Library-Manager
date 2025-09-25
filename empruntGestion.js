// ===================================
// 3. GESTION DES EMPRUNTS
// ===================================

/**
 * Permet à un utilisateur d'emprunter un livre
 * @param {number} utilisateurId - ID de l'utilisateur
 * @param {number} livreId - ID du livre
 * @returns {object} Résultat de l'opération
 */
function emprunterLivre(utilisateurId, livreId) {
  const bibliotheque = JSON.parse(localStorage.getItem("bibliotheque"));

  // Vérifier que l'utilisateur existe
  const utilisateur = bibliotheque.utilisateurs.find(u => u.id === utilisateurId);
  if (!utilisateur) {
    return { succes: false, message: "Utilisateur introuvable." };
  }

  // Vérifier que le livre existe
  const livre = bibliotheque.livres.find(l => l.id === livreId);
  if (!livre) {
    return { succes: false, message: "Livre introuvable." };
  }

  // Vérifier que le livre est disponible
  if (!livre.disponible) {
    return { succes: false, message: "Livre déjà emprunté." };
  }

  // Vérifier que l'utilisateur n'a pas déjà 3 emprunts actifs
  const empruntsActifs = bibliotheque.emprunts.filter(e =>
    e.utilisateurId === utilisateurId && !e.dateRetourEffective
  );
  if (empruntsActifs.length >= 3) {
    return { succes: false, message: "Limite de 3 emprunts atteinte pour cet utilisateur." };
  }

  // Définir les dates d'emprunt et de retour prévu
  const dateEmprunt = new Date();
  const dateRetourPrevue = new Date();
  dateRetourPrevue.setDate(dateEmprunt.getDate() + 14);

  // Créer l'objet emprunt
  const emprunt = {
    id: bibliotheque.prochainIdEmprunt++,
    utilisateurId,
    livreId,
    dateEmprunt: dateEmprunt.toISOString().split("T")[0],
    dateRetourPrevue: dateRetourPrevue.toISOString().split("T")[0],
    dateRetourEffective: null
  };

  // Ajouter l'emprunt à la bibliothèque
  bibliotheque.emprunts.push(emprunt);

  // Marquer le livre comme indisponible
  livre.disponible = false;

  // Sauvegarder les modifications
  localStorage.setItem("bibliotheque", JSON.stringify(bibliotheque));

  return { succes: true, message: "Emprunt enregistré avec succès.", emprunt };
}



/**
 * Gère les suggestions dynamiques pour un champ de saisie
 * @param {string} inputId - ID du champ input
 * @param {string} suggestionsId - ID du conteneur de suggestions
 * @param {array} dataSource - Tableau de données à filtrer
 * @param {function} formatter - Fonction pour afficher chaque suggestion
 * @param {function} onSelect - Fonction appelée lors de la sélection
 */
function setupAutocomplete(inputId, suggestionsId, dataSource, formatter, onSelect) {
  const input = document.getElementById(inputId);
  const suggestions = document.getElementById(suggestionsId);

  input.addEventListener("input", () => {
    const query = input.value.toLowerCase();
    suggestions.innerHTML = "";

    if (query.length < 2) return;

    const matches = dataSource.filter(item =>
      formatter(item).toLowerCase().includes(query)
    );

    matches.forEach(item => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "list-group-item list-group-item-action";
      option.textContent = formatter(item);
      option.addEventListener("click", () => {
        input.value = formatter(item);
        onSelect(item);
        suggestions.innerHTML = "";
      });
      suggestions.appendChild(option);
    });
  });

  // Fermer les suggestions si on clique ailleurs
  document.addEventListener("click", (e) => {
    if (!suggestions.contains(e.target) && e.target !== input) {
      suggestions.innerHTML = "";
    }
  });
}

// Initialisation des suggestions

let selectedUtilisateurId = null;
let selectedLivreId = null;

const mybibliotheque = JSON.parse(localStorage.getItem("bibliotheque")) || {
  utilisateurs: [],
  livres: [],
  emprunts: []
};

// Suggestions pour les utilisateurs
setupAutocomplete(
  "utilisateurSelect",
  "utilisateurSuggestions",
  mybibliotheque.utilisateurs,
  (u) => `${u.nom} (${u.email})`,
  (u) => { selectedUtilisateurId = u.id; }
);

// Suggestions pour les livres disponibles
setupAutocomplete(
  "livreSelect",
  "livreSuggestions",
  mybibliotheque.livres.filter(l => l.disponible), // ne prendre que les livres disponibles
  (l) => `${l.titre} - ${l.auteur}`,
  (l) => { selectedLivreId = l.id; }
);


// Formulaire d'ajout d'emprunt
document.getElementById("empruntForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const messageEmprunt = document.getElementById("messageEmprunt");

  // Vérifier que les deux sélections sont faites
  if (!selectedUtilisateurId || !selectedLivreId) {
    messageEmprunt.textContent = "Veuillez sélectionner un utilisateur et un livre.";
    messageEmprunt.classList.remove("d-none", "alert-success");
    messageEmprunt.classList.add("alert-danger");
    return;
  }

  // Tenter l'emprunt
  const resultat = emprunterLivre(selectedUtilisateurId, selectedLivreId);

  // Afficher le message de retour
  messageEmprunt.textContent = resultat.message;
  messageEmprunt.classList.remove("d-none");
  messageEmprunt.classList.toggle("alert-success", resultat.succes);
  messageEmprunt.classList.toggle("alert-danger", !resultat.succes);

  // Réinitialiser le formulaire si succès
  if (resultat.succes) {
    document.getElementById("empruntForm").reset();
    selectedUtilisateurId = null;
    selectedLivreId = null;
    renderEmprunts(); // Met à jour l'affichage des emprunts
  }
});


/**
 * Afficher les emprunts dans le tableau HTML
 * @param {array|null} emprunts - Liste des emprunts (ou chargée depuis localStorage si null)
 */
function renderEmprunts(emprunts = bibliotheque.emprunts) {
  const tbody = document.getElementById("empruntTbody");
  tbody.innerHTML = ""; // On vide avant de remplir

  // Charger depuis localStorage si pas de liste passée
  if (!Array.isArray(emprunts)) {
    const data = JSON.parse(localStorage.getItem("bibliotheque")) || {};
    emprunts = Array.isArray(data.emprunts) ? data.emprunts : [];
  }

  // Si aucun emprunt → message
  if (!emprunts ||emprunts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Aucun emprunt trouvé</td></tr>`;
    return;
  }

  // Récupérer aussi les utilisateurs et livres depuis localStorage
  const data = JSON.parse(localStorage.getItem("bibliotheque")) || {};
  const utilisateurs = data.utilisateurs || [];
  const livres = data.livres || [];

  emprunts.forEach(emprunt => {
    const utilisateur = utilisateurs.find(u => u.id === emprunt.utilisateurId);
    const livre = livres.find(l => l.id === emprunt.livreId);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${emprunt.id}</td>
      <td>${utilisateur ? utilisateur.nom : "Utilisateur introuvable"}</td>
      <td>${livre ? livre.titre : "Livre introuvable"}</td>
      <td>${emprunt.dateEmprunt}</td>
      <td>${emprunt.dateRetourPrevue}</td>
      <td>${emprunt.dateRetourEffective ?? "-"}</td>
      <td>
        ${
          emprunt.dateRetourEffective
            ? `<span class="text-success">Livre retourné</span>`
            : `<button class="btn btn-sm btn-success" livre-id="${livre.id}">Retourner un livre</button>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Ajout des écouteurs sur les boutons "Retourner"
  const boutons = tbody.querySelectorAll("button[livre-id]");
  boutons.forEach(btn => {
      btn.addEventListener("click", function () {
          const id = parseInt(this.getAttribute("livre-id"));
          retournerLivre(id);
      });
  });
}

/**
 * Charger les emprunts au démarrage + affichage
 */
window.addEventListener("DOMContentLoaded", () => {
    renderEmprunts();
});


/**
 * Retourner un livre emprunté
 * @param {number} livreId - ID du livre à retourner
 */
function retournerLivre(livreId) {
  // Récupérer les données depuis le localStorage
  const bibliotheque = JSON.parse(localStorage.getItem("bibliotheque")) || {};
  if (!bibliotheque.emprunts || !bibliotheque.livres) return;

  const messageEmprunt = document.getElementById("messageEmprunt");
  messageEmprunt.classList.add("d-none");

  // Trouver l'emprunt actif lié à ce livre
  const emprunt = bibliotheque.emprunts.find(
    e => e.livreId === livreId && !e.dateRetourEffective
  );

  // Si aucun emprunt actif trouvé
  if (!emprunt) {
    messageEmprunt.textContent = "Aucun emprunt actif trouvé pour ce livre.";
    messageEmprunt.classList.remove("d-none");
    messageEmprunt.classList.add("alert-danger");
    return;
  }

  // Mettre la date de retour effective
  emprunt.dateRetourEffective = new Date().toISOString().split("T")[0];

  // Marquer le livre comme disponible
  const livre = bibliotheque.livres.find(l => l.id === livreId);
  if (livre) {
    livre.disponible = true;
  }

  // Sauvegarder les modifications
  localStorage.setItem("bibliotheque", JSON.stringify(bibliotheque));

  // Afficher le message de succès
  messageEmprunt.textContent = "Le livre a été retourné avec succès.";
  messageEmprunt.classList.remove("d-none");

  // Rafraîchir l'affichage si tu as une fonction dédiée
  if (typeof renderLibrary === "function") {
    renderLibrary();
  }
  if (typeof renderEmprunts === "function") {
    renderEmprunts();
  }
}
