# Contented Jóváhagyó Portál

Ügyfélportál a havi tartalmak jóváhagyásához: posztok, kreatívok, videók, kommentek, státuszok, csomagadatok és felugró ajánlat (upsell). Minden ügyfél csak a saját anyagát látja.

Stack: Next.js 15 (Vercel), Supabase (adatbázis, belépés, fájltárolás).

## Beüzemelés (egyszer, kb. 30 perc)

### 1. Supabase projekt

1. supabase.com → New project. Régió: **Central EU (Frankfurt)**. Jelszót mentsd el.
2. SQL Editor → New query → másold be a `supabase/migrations/0001_init.sql` teljes tartalmát → Run.
3. Project Settings → API: jegyezd fel a **Project URL**, az **anon public** és a **service_role** kulcsot.

### 2. Belépés beállítása (Supabase → Authentication)

1. **URL Configuration**
   - Site URL: `https://portal.contented.hu`
   - Redirect URLs: `https://portal.contented.hu/**` és a Vercel teszt-cím, pl. `https://contented-portal.vercel.app/**`
2. **Email Templates** (hogy a link másik eszközön is működjön):
   - *Magic Link*: a link legyen
     `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email`
   - *Invite user*: a link legyen
     `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite`
   - A szövegeket nyugodtan írd át magyarra, Contented hangon.
3. Ajánlott: **SMTP** beállítása (Project Settings → Auth → SMTP), saját küldő címmel (pl. portal@contented.hu). A beépített küldő óránként csak néhány e-mailt enged.

### 3. Admin fiók (te)

1. Authentication → Users → Add user → Send invitation, a saját e-mail címeddel.
2. SQL Editor-ben futtasd (a címet írd át):
   ```sql
   update public.profiles
      set role = 'admin', full_name = 'Marci'
    where id = (select id from auth.users where email = 'marcellcsordas@gmail.com');
   ```

### 4. Vercel

1. vercel.com → Add New → Project → válaszd ki a `contented-portal` GitHub repót → Import.
2. Environment Variables (a `.env.example` alapján):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (titkos, csak itt)
   - `NEXT_PUBLIC_SITE_URL` = `https://portal.contented.hu`
3. Deploy.

### 5. Domain (MHosting)

1. Vercel → Project → Settings → Domains → add: `portal.contented.hu`.
2. MHosting DNS-kezelő → új rekord: típus `CNAME`, név `portal`, érték `cname.vercel-dns.com`.
3. Pár perc, és a Vercel kiírja, hogy él. A HTTPS automatikus.

## Napi használat

- `/admin`: ügyfelek listája, várakozó jóváhagyások, beérkezett ajánlat-kérések, új ügyfél.
- Ügyfél oldala: havi tartalmak, új tartalom feltöltése (kép vagy mp4, max. 50 MB), státusz, csomag, felugró ajánlat, ügyfél meghívása.
- „Ügyfélnézet”: pontosan így látja az ügyfél.
- Az ügyfél e-mailben kap meghívót, utána jelszó nélkül, belépő linkkel lép be.

## Mit tud az ügyfél

- Havi nézet, szűrés státuszra, hónapok közti lapozás.
- Poszt megnyitása: vizuál vagy videó, teljes szöveg, Contented jegyzet, kommentszál.
- „Elfogadom”, „Módosítást kérek” (ez kommentet is ír és számolja a módosítási kört), „Mind elfogadom”.
- Csomag, havidíj, havi felhasználás, feltételek.
- Felugró ajánlat, „Ezt választom” gombbal. A kérés az admin főoldalon jelenik meg.

## Biztonság röviden

- Sorszintű jogosultság (RLS) minden táblán: az ügyfél csak a saját cégének adatait olvassa.
- Státuszt az ügyfél csak két irányba válthat (Elfogadva, Módosítás alatt), csak jóváhagyásra váró posztnál.
- A fájlok privát tárolóban vannak, 1 órás aláírt linkkel jelennek meg.
- A komment szerzőjét az adatbázis állítja be, nem hamisítható.

## Következő lépések

- E-mail értesítés státuszváltáskor (Supabase webhook vagy Make.com).
- Videók Cloudflare R2-re vagy Streamre, ha a havi forgalom nő.
- Ajánlat-kérésből automatikus ClickUp feladat vagy Billingó díjbekérő.

## Fejlesztés helyben

```bash
cp .env.example .env.local   # töltsd ki
npm install
npm run dev
```
