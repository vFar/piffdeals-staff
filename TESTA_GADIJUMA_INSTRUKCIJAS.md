# Testa gadījumu saraksts - Izmantošanas instrukcijas

## Fails
`test-cases-piffdeals-staff.csv` - Excel faila formāts ar 300 testa gadījumiem

## Kolonnu struktūra

1. **Testa Nr.** - Unikāls testa gadījuma numurs
2. **Testa gadījums** - Testa gadījuma apraksts latviešu valodā
3. **Kategorija** - Frontend vai Backend
4. **Apakškategorija** - Detalizēta kategorija (piemēram, Autentifikācija, Rēķini, API, utt.)
5. **Ievades dati** - Kas jāievada/testē
6. **Gaidāmā izvade** - Kas jāgaida kā rezultāts
7. **Testa soļi** - Darbības, kas jāveic testa izpildei
8. **Rezultāts** - **ŠIS LAUKS JĀAIZPILDA** - ierakstīt "Passed" vai "Failed"
9. **Piezīmes** - **ŠIS LAUKS JĀAIZPILDA** - jebkādas piezīmes, problēmas, ekrānuzņēmumi, utt.

## Testēšanas process

### Frontend testēšana (2 cilvēki bez programmēšanas zināšanām)

1. Atveriet `test-cases-piffdeals-staff.csv` failu Excel vai Google Sheets
2. Filtrējiet pēc kolonnas "Kategorija" = "Frontend"
3. Secīgi izpildiet katru testa gadījumu
4. Aizpildiet kolonnu **"Rezultāts"**:
   - **"Passed"** - ja tests veiksmīgs
   - **"Failed"** - ja tests neveiksmīgs
5. Aizpildiet kolonnu **"Piezīmes"** ar:
   - Problēmas aprakstu (ja Failed)
   - Ekrānuzņēmumu celiņu
   - Papildu novērojumiem
   - Problēmas reproducēšanas soļiem

### Backend testēšana (izstrādātājs)

1. Filtrējiet pēc kolonnas "Kategorija" = "Backend"
2. Secīgi izpildiet katru testa gadījumu
3. Aizpildiet kolonnu **"Rezultāts"** ar "Passed" vai "Failed"
4. Aizpildiet kolonnu **"Piezīmes"** ar:
   - API atbildes
   - Log ziņojumus
   - Error ziņojumus
   - Performance metrikas

## Testa gadījumu kategorijas

### Frontend testi (~150 testi)
- Autentifikācija un Login
- Rēķinu pārvaldība (Create, Edit, Delete, View)
- Lietotāju pārvaldība (Admin/Super Admin)
- Dashboard un Analytics
- Profila pārvaldība
- Paroles maiņa
- Rēķinu šabloni
- Activity Logs (Super Admin)
- Form validācija un sanitizācija
- UI/UX testēšana
- Maršrutēšanas aizsardzība
- Responsive design

### Backend testi (~150 testi)
- API endpoints testēšana
- Database RLS policies
- Edge Functions testēšana
- Email funkcionalitāte
- Mozello API integrācija
- Stripe API integrācija
- Security testēšana
- Performance testēšana
- Activity Logging
- Error Handling
- Database transactions
- Compliance (GDPR)

## Svarīgi!

- **Visi testi jāizpilda pirms deployment**
- Ja tests Failed, jāpievieno detalizētas piezīmes
- Ekrānuzņēmumi jāsaglabā un jāpievieno piezīmēs
- Backend testiem jāietver API atbildes un log ziņojumi
- Jāpārbauda gan pozitīvie, gan negatīvie scenāriji
- Jāpārbauda edge cases un error handling

## Rezultātu analīze

Pēc visu testu izpildes:
1. Saskaitiet "Passed" un "Failed" rezultātus
2. Izveidojiet sarakstu ar visiem Failed testiem
3. Prioritizējiet kritiskos Failed testus
4. Labojiet problēmas un atkārtojiet Failed testus

## Piemērs aizpildīšanai

| Testa Nr. | Testa gadījums | ... | Rezultāts | Piezīmes |
|-----------|----------------|-----|-----------|----------|
| 1 | Login ar pareiziem datiem | ... | Passed | Viss darbojās pareizi |
| 2 | Login ar nepareizu paroli | ... | Failed | Kļūdas ziņojums neparādās. Ekrānuzņēmums: screenshots/error1.png |
| 3 | Login ar nepareizu e-pastu | ... | Passed | Validācija darbojas |

## Palīdzība

Ja rodas jautājumi vai problēmas:
- Konsultējieties ar izstrādātāju
- Izmantojiet projekta dokumentāciju
- Pārbaudiet konsoli paziņojumus (F12)

---

**Veiksmi testēšanā!** 🚀

