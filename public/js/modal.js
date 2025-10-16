document.addEventListener("DOMContentLoaded", () => {
    // crée la modale (une seule fois)
    const modal = document.createElement("div");
    modal.classList.add("modal");
    modal.innerHTML = `
        <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <span class="close-modal" aria-label="Fermer">&times;</span>
            <!--<img src="" alt="Photo du chat">-->
            <h2 id="modal-title"></h2>
            <p class="race"></p>
            <p class="caractere"></p>
            <p class="jouet"></p>
            <p class="description"></p>
            <p class="prix"></p>
        </div>
    `;
    document.body.appendChild(modal);

    //const modalImg = modal.querySelector("img");
    const modalTitle = modal.querySelector("h2");
    const modalRace = modal.querySelector(".race");
    const modalCaractere = modal.querySelector(".caractere");
    const modalJouet = modal.querySelector(".jouet");
    const modalDesc = modal.querySelector(".description");
    const modalPrix = modal.querySelector(".prix");
    const closeBtn = modal.querySelector(".close-modal");

    const buttons = document.querySelectorAll(".btn-details");
    if (!buttons || buttons.length === 0) {
        // rien à faire si pas de boutons
        return;
    }

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            // sécurise valeurs null/undefined
//            const img = button.dataset.image || "/images/default-cat.jpg";
            const nom = button.dataset.nom || "Chat";
            const race = button.dataset.race || "Inconnue";
            const age = button.dataset.age || "?";
            const caractere = button.dataset.caractere || "Non renseigné";
            const jouet = button.dataset.jouet || "Non renseigné";
            const description = button.dataset.description || "Pas de description";
            const prix = button.dataset.prix || "—";

           // modalImg.src = img;
            //modalImg.alt = `Photo de ${nom}`;
            modalTitle.textContent = nom;
            modalRace.textContent = `Race : ${race} — ${age} ans`;
            modalCaractere.textContent = `Caractère : ${caractere}`;
            modalJouet.textContent = `Jouet préféré : ${jouet}`;
            modalDesc.textContent = `Description : ${description}`;
            modalPrix.textContent = `Prix : ${prix} € / jour`;

            modal.style.display = "flex";
            // focus pour accessibilité
            modal.querySelector(".modal-content").focus();
        });
    });

    // fermer
    closeBtn.addEventListener("click", () => modal.style.display = "none");
    modal.addEventListener("click", e => {
        if (e.target === modal) modal.style.display = "none";
    });

    // fermeture avec Esc
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.style.display === "flex") {
            modal.style.display = "none";
        }
    });
});
