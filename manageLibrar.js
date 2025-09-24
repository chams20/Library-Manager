// ==========================
// Structure de données
// ==========================
let bibliotheque = {
    livres: [],
    utilisateurs: [],
    emprunts: [],
    prochainIdLivre: 1,
    prochainIdUtilisateur: 1,
    prochainIdEmprunt: 1
};


/**
 * Charger les données de la bibliothèque depuis localStorage avec getItem()
 */
function chargerBibliotheque() {
    const libraryData = localStorage.getItem("bibliotheque");
    if (libraryData) {
        bibliotheque = JSON.parse(libraryData);
    }
}

/**
 * Sauvegarder les données de la bibliothèque dans localStorage
 */
function sauvegarderBibliotheque() {
    localStorage.setItem("bibliotheque", JSON.stringify(bibliotheque));
}

/**
 * Vérifier si l'ISBN est valide, il y a deux versions (ISBN-10 ou ISBN-13)
 * ISBN-10 = 10 chiffres
 * ISBN-13 = 13 chiffres
 */
function verifierISBN(isbn) {
    // ISBN10 format officiel X-XXXX-XXXX-X
    const isbn10 = /^\d{1}-\d{4}-\d{4}-[\dX]$/;
    // ISBN13 format officiel 978-X-XXXX-XXXX-X avec 978 invariable
    const isbn13 = /^978-\d{1}-\d{4}-\d{4}-\d{1}$/;

    if (isbn10.test(isbn)) return "ISBN-10";
    if (isbn13.test(isbn)) return "ISBN-13";

    return false; // si aucun format ne correspond
}


/**
 * Ajoute un livre à la bibliothèque avec validation complète
 * @param {string} titre - Titre du livre
 * @param {string} auteur - Auteur du livre
 * @param {string} isbn - ISBN du livre (10 ou 13 chiffres uniquement)
 * @param {number} annee - Année de publication
 * @param {string} genre - Genre du livre
 * @returns {object} Résultat de l'opération
 */
function ajouterLivre(titre, auteur, isbn, annee, genre) {
    // Vérifier que tous les paramètres sont fournis
    if (!titre || !auteur || !isbn || !annee || !genre) {
        return { succes: false, message: "Tous les champs sont obligatoires." };
    }

    // Vérifier le format ISBN (10 ou 13 chiffres uniquement)
    if (!verifierISBN(isbn)) {
        return { succes: false, message: "ISBN invalide (seuls ISBN-10 ou ISBN-13 sont acceptés)." };
    }

    // Vérifier que l'année est valide
    const currentYear = new Date().getFullYear();
    if (annee < 1000 || annee > currentYear) {
        return { succes: false, message: "Année de publication invalide." };
    }

    // Vérifier que l'ISBN n'existe pas déjà
    const existe = bibliotheque.livres.some(l => l.isbn === isbn);
    if (existe) {
        return { succes: false, message: "Un livre avec ce même ISBN existe déjà." };
    }

    // Créer le livre avec ID unique
    const livre = {
        id: bibliotheque.prochainIdLivre++,
        titre,
        auteur,
        isbn,
        annee,
        genre,
        disponible: true // par défaut un livre est dispo
    };

    // Ajouter à la collection
    bibliotheque.livres.push(livre);

    // Sauvegarde dans localStorage
    sauvegarderBibliotheque();

    return { succes: true, message: "Livre ajouté avec succès.", livre };
}

/**
 * Afficher des livres dans le tableau HTML
 * @param {Array} livres - Liste de livres à afficher (par défaut tous les livres)
 */
function renderLibrary(livres = bibliotheque.livres) {
    const tbody = document.getElementById("libraryTbody");
    tbody.innerHTML = ""; // On vide le tableau avant de re-remplir

    // Si aucun livre à afficher
    if (!livres || livres.length === 0) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="8" class="text-center text-muted">Aucun livre en stock.</td>`;
        tbody.appendChild(tr);
        return;
    }

    // Sinon, on affiche les livres
    livres.forEach(livre => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${livre.id}</td>
            <td>${livre.titre}</td>
            <td>${livre.auteur}</td>
            <td>${livre.isbn}</td>
            <td>${livre.annee}</td>
            <td>${livre.genre}</td>
            <td>${livre.disponible ? "Disponible" : "Emprunté"}</td>
            <td><button class="btn btn-sm btn-danger" data-id="${livre.id}">Supprimer</button></td>
        `;

        tbody.appendChild(tr);
    });

    // Ajout des écouteurs sur les boutons "Supprimer"
    const boutons = tbody.querySelectorAll("button[data-id]");
    boutons.forEach(btn => {
        btn.addEventListener("click", function () {
            const id = parseInt(this.getAttribute("data-id"));
            supprimerLivre(id);
        });
    });
}


/**
 * Écouteur de formulaire pour ajouter un livre
 */
document.getElementById("bookForm").addEventListener("submit", function (e) {
    // Empêche le rechargement de la page lors de la soumission du formulaire
    e.preventDefault();

    // Récupération des valeurs saisies par l'utilisateur
    let titre = document.getElementById("titre").value.trim();
    let auteur = document.getElementById("auteur").value.trim();
    let isbn = document.getElementById("isbn").value.trim();
    let annee = parseInt(document.getElementById("annee").value.trim());
    let genre = document.getElementById("genre").value.trim();

    // Récupération des div pour afficher erreur ou résultat
    let messageResult = document.getElementById("message");

    // Réinitialisation des messages
    messageResult.classList.add("d-none");

    // Appel de la fonction d'ajout
    let resultat = ajouterLivre(titre, auteur, isbn, annee, genre);

    // Affichage du message de résultat
    messageResult.textContent = resultat.message;
    messageResult.classList.remove("d-none");
    messageResult.classList.toggle("alert-success", resultat.succes);
    messageResult.classList.toggle("alert-danger", !resultat.succes);
    

    // Si on a un succès, on met à jour l'affichage
    if (resultat.succes) {
        renderLibrary();
        // On peut aussi réinitialiser le formulaire
        document.getElementById("bookForm").reset();
    }
});

/**
 * Charger la bibliothèque au démarrage + affichage
 */
window.addEventListener("DOMContentLoaded", () => {
    chargerBibliotheque();
    renderLibrary();
});



/**
 * Recherche des livres avec un mot-clé
 * @param {string} keyword - Mot-clé saisi (titre, auteur, genre ou année)
 * @returns {object} Résultat de la recherche
 */
function rechercherLivres(keyword) {

    const libraryData = JSON.parse(localStorage.getItem("bibliotheque"));
    if (!libraryData || !libraryData.livres) {
        return { succes: false, message: "Bibliothèque vide.", livres: [] };
    }

    const motCle = keyword.toLowerCase();

    const resultats = libraryData.livres.filter(livre => {
        return (
            livre.titre.toLowerCase().includes(motCle) ||
            livre.auteur.toLowerCase().includes(motCle) ||
            livre.genre.toLowerCase().includes(motCle) ||
            livre.annee.toString().includes(motCle)
        );
    });

    let message;
    if (resultats.length === 0) {
        message = "Aucun livre trouvé.";
        return { succes: false, message, livres: [] };
    } else if (resultats.length === 1) {
        message = "1 livre trouvé.";
    } else {
        message = `${resultats.length} livres trouvés.`;
    }

    return { succes: true, message, livres: resultats };
}



// Barre de recherche
const searchInput = document.getElementById("searchInput");

searchInput.addEventListener("input", () => {
    const valeur = searchInput.value.trim();

    if (valeur === "") {
        // Si la recherche est vide → afficher toute la bibliothèque
        renderLibrary();
        return;
    }

    const resultats = rechercherLivres(valeur);

    if (resultats.succes) {
        renderLibrary(resultats.livres);
    } else {
        const tbody = document.getElementById("libraryTbody");
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">${resultats.message}</td></tr>`;
    }
});


/**
 * Supprimer un livre par son ID
 * @param {number} id - ID du livre à supprimer
 */
function supprimerLivre(id) {
    // Récupération des données depuis le localStorage
    const data = JSON.parse(localStorage.getItem("bibliotheque"));

    /**
     * Filtrer les livres pour retirer celui avec l'ID donné
     * Cette ligne ne supprime pas directement un élément comme .delete ou .splice.
     * Elle crée un nouveau tableau contenant tous les livres sauf celui dont l’ID correspond.
     * */
    data.livres = data.livres.filter(livre => livre.id !== id);

    // Mettre à jour le localStorage
    localStorage.setItem("bibliotheque", JSON.stringify(data));

    // Mettre à jour la variable globale si utilisée
    bibliotheque = data;

    // Recharger l'affichage
    renderLibrary();
}



// ===================================
// 2. GESTION DES UTILISATEURS
// ===================================

/**
 * Ajoute un utilisateur à la bibliothèque
 * @param {string} nom - Nom de l'utilisateur
 * @param {string} email - Email de l'utilisateur
 * @param {string} telephone - Numéro de téléphone
 * @returns {object} Résultat de l'opération
 */
function ajouterUtilisateur(nom, email, telephone) {
    // Vérifier que tous les champs sont remplis
    if (!nom || !email || !telephone) {
        return { succes: false, message: "Tous les champs sont obligatoires." };
    }

    // Vérifier format email
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexEmail.test(email)) {
        return { succes: false, message: "Email invalide." };
    }

    // Vérifier format téléphone (10 chiffres uniquement)
    const regexTel = /^\d{10}$/;
    if (!regexTel.test(telephone)) {
        return { succes: false, message: "Téléphone invalide (10 chiffres attendus)." };
    }

    // Vérifier que l'email n'existe pas déjà
    const existe = bibliotheque.utilisateurs.some(u => u.email === email);
    if (existe) {
        return { succes: false, message: "Un utilisateur avec cet email existe déjà." };
    }

    // Créer l'utilisateur
    const utilisateur = {
        id: bibliotheque.prochainIdUtilisateur++,
        nom,
        email,
        telephone
    };

    // Ajouter à la collection
    bibliotheque.utilisateurs.push(utilisateur);

    // Sauvegarde dans le localStorage
    localStorage.setItem("bibliotheque", JSON.stringify(bibliotheque));

    return { succes: true, message: "Utilisateur ajouté avec succès.", utilisateur };
}

// ===================================
// Affichage des utilisateurs
// ===================================

/**
 * Afficher les utilisateurs dans le tableau HTML
 * @param {array} utilisateurs - Liste des utilisateurs à afficher
 */
function renderUsers(utilisateurs = null) {
    const tbody = document.getElementById("userTbody");
    tbody.innerHTML = ""; // On vide avant de remplir

    // Charger depuis localStorage si pas de liste passée
    if (!utilisateurs) {
        const data = JSON.parse(localStorage.getItem("bibliotheque"));
        if (data && data.utilisateurs) {
            utilisateurs = data.utilisateurs;
        } else {
            utilisateurs = [];
        }
    }

    if (utilisateurs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Aucun utilisateur trouvé</td></tr>`;
        return;
    }

    utilisateurs.forEach(user => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${user.id}</td>
            <td>${user.nom}</td>
            <td>${user.email}</td>
            <td>${user.telephone}</td>
            <td><button class="btn btn-sm btn-danger" user-id="${user.id}">Supprimer</button></td>
        `;
        tbody.appendChild(tr);
    });

    // Ajout des écouteurs sur les boutons "Supprimer"
    const boutons = tbody.querySelectorAll("button[user-id]");
    boutons.forEach(btn => {
        btn.addEventListener("click", function () {
            const id = parseInt(this.getAttribute("user-id"));
            supprimerUtilisateur(id);
        });
    });
}

// ===================================
// Gestion du formulaire utilisateur
// ===================================

document.getElementById("userForm").addEventListener("submit", function (e) {
    e.preventDefault();

    // Récupération des champs
    const nom = document.getElementById("nom").value.trim();
    const mail = document.getElementById("mail").value.trim();
    const telephone = document.getElementById("telephone").value.trim();

    const messageDiv = document.getElementById("messageUser");
    messageDiv.classList.add("d-none");

    // Ajout utilisateur
    const result = ajouterUtilisateur(nom, mail, telephone);

    // Affichage du message
    messageDiv.textContent = result.message;
    messageDiv.classList.remove("d-none");
    messageDiv.classList.toggle("alert-success", result.succes);
    messageDiv.classList.toggle("alert-danger", !result.succes);

    if (result.succes) {
        // Réinitialiser formulaire
        document.getElementById("userForm").reset();
        // Réafficher le tableau
        renderUsers();
    }
});

// ===================================
// Recherche utilisateur
// ===================================

document.getElementById("searchUserInput").addEventListener("input", () => {
    const valeur = document.getElementById("searchUserInput").value.trim().toLowerCase();

    if (valeur === "") {
        renderUsers(); // Affiche tout
        return;
    }

    const data = JSON.parse(localStorage.getItem("bibliotheque"));
    if (!data || !data.utilisateurs) return;

    const resultats = data.utilisateurs.filter(user =>
        user.nom.toLowerCase().includes(valeur) ||
        user.email.toLowerCase().includes(valeur) ||
        user.telephone.includes(valeur)
    );

    renderUsers(resultats);
});

// ===================================
// Initialisation au chargement
// ===================================
window.addEventListener("DOMContentLoaded", () => {
    renderUsers();
});



/**
 * Supprimer un utilisateur par son ID
 * @param {number} id - ID de l'utilisateur à supprimer
 */
function supprimerUtilisateur(id) {
    // Récupération des données depuis le localStorage
    const data = JSON.parse(localStorage.getItem("bibliotheque"));

    /**
     * Filtrer les utilisateur pour retirer celui avec l'ID donné
     * */
    data.utilisateurs = data.utilisateurs.filter(user => user.id !== id);

    // Mettre à jour le localStorage
    localStorage.setItem("bibliotheque", JSON.stringify(data));

    // Mettre à jour la variable globale si utilisée
    bibliotheque = data;

    // Recharger l'affichage
    renderLibrary();
}
