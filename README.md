# 🏠 House Wishlist

La lista di tutto quello che serve per la casa nuova, stanza per stanza, con budget, foto e link.
Vedi un prodotto online, clicchi l'icona nel browser e finisce nella lista, già con nome, prezzo e stanza (li capisce Gemini).

*A shared shopping list for furnishing a new home: Google Sheets + a small Apps Script web app + a Chrome extension. Gemini (free tier) reads product pages and files each item under the right room. Italian guide below.*

- **Gratis:** Google Sheets, Apps Script e il piano gratuito di Gemini.
- **Privato:** ognuno ha la sua copia sul proprio Google Drive. La chiave Gemini resta nelle impostazioni dello script, non nel foglio.
- **In due:** condividi il foglio con il partner come Editor e usate la stessa lista.

## Inizia

| | |
|---|---|
| 1. Crea la tua lista | [Crea una copia del foglio ↗](https://docs.google.com/spreadsheets/d/1nNgXQRwBtEuTrC0G84SEBZ5U2WfVK6_cUf2_ficSf08/copy) (l'app viene copiata insieme) |
| 2. Chiave Gemini gratuita | [Google AI Studio ↗](https://aistudio.google.com/apikey) |
| 3. Estensione per Chrome | [Scarica lo zip ↗](https://drive.google.com/uc?export=download&id=1M59XeUV0NgWn7CxW5uH9lDWO0PFTS8j6) oppure *Code → Download ZIP* qui sopra |
| Guida completa | [Apri la guida ↗](https://script.google.com/macros/s/AKfycbzESKneL787IbXefKeIk2hGIDDvi1wmr3LX4lbnLJxZa0vsB6N_bMlFIQomaGjRVheY/exec) (anche in [`docs/index.html`](docs/index.html)) |

### In breve
1. **Copia il foglio** con il link qui sopra e premi F5. Compare il menu **🏠 House Wishlist**.
2. **🏠 House Wishlist → 1. Set up the list**: Google chiede il permesso (*Avanzate → Vai a House Wishlist → Consenti*).
3. **🏠 House Wishlist → 2. Set Gemini API key**: incolla la chiave presa su AI Studio, poi **Test Gemini**.
4. **Pubblica l'app:** *Estensioni → Apps Script → Esegui il deployment → Nuovo deployment → ⚙ App web*.
   *Esegui come:* Utente che accede all'app web · *Chi ha accesso:* Chiunque abbia un account Google.
   Copia l'URL che finisce con **`/exec`**: è la tua lista.
5. **Estensione:** estrai lo zip, doppio clic su **`INSTALLA House Wishlist.bat`** (Windows) e segui i 3 passaggi.
   Su Mac: apri `chrome://extensions`, accendi *Modalità sviluppatore* e trascina dentro la cartella `casa-extension`.
   Al primo clic sull'icona 🏠 incolla il tuo link `/exec`.

### Per i pigri: fallo fare a un'AI
Se usi un assistente che controlla il browser (per esempio Claude con l'estensione per Chrome), incollagli il testo in
[`Testo per assistente AI.txt`](Testo%20per%20assistente%20AI.txt). Fa i passaggi 1–4 e si ferma quando servono i tuoi clic
(autorizzazioni Google e chiave API restano a te).

## Cosa c'è qui

| Cartella / file | Cosa fa |
|---|---|
| `apps-script/Code.gs` | Il "server": legge e scrive il foglio, chiede a Gemini nome/prezzo/stanza, riceve i prodotti dall'estensione. |
| `apps-script/Index.html` | L'app web: lista per stanze, priorità, stato, foto, budget, valute (cambi di Google Finance). |
| `casa-extension/` | Estensione Chrome (Manifest V3): legge la pagina del prodotto dal tuo browser e la salva nella tua lista. |
| `INSTALLA House Wishlist.bat` + `Installa House Wishlist.html` | Installazione guidata dell'estensione su Windows. |
| `docs/index.html` | La guida passo passo. |

### Note
- I prezzi sono salvati in won coreani (₩) e mostrati nella valuta scelta dalla rotellina ⚙ dell'app (di base euro).
- Alcuni negozi bloccano la lettura automatica: in quel caso usa l'estensione, che legge la pagina dal tuo browser.
- Apps Script elimina tutto ciò che segue `//` nel JavaScript delle pagine HTML: se modifichi `Index.html`, non usare `//` dentro regex o template string.
- Dopo aver modificato il codice: *Esegui il deployment → Gestisci deployment → ✏️ → Nuova versione*. L'URL resta lo stesso.

## Licenza
MIT, vedi [LICENSE](LICENSE).
