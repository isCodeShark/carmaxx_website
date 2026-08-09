# Carmaxx — direct email sending + Vercel deploy

**Goal:** replace the current `mailto:` behaviour on the quote and contact forms with a
real HTTP submission, so the page never navigates away and no email client opens.
All mail goes to **rafid@badgerbytesoftware.com** for now.

**Stack decision:** Web3Forms. It is a hosted form endpoint — no backend, no npm
dependency, no build step, and the access key is safe to ship in client-side code.
(Alternatives considered: Formspree — same shape, lower free tier; EmailJS — needs an
SDK and template config; Getform — fine but the free plan caps at 50/month.)

---

## The site as it stands

Plain static HTML/CSS/JS. No framework, no build step, no package.json.

```
site/
  index.html        home (hero, interactive chart, testimonial, dealer section)
  coverage.html
  claims.html
  about.html
  quote.html        ← form #1: quote request
  contact.html      ← form #2: general contact / partner enquiry
  privacy.html
  styles.css
  chart.js          Chart.js setup for the home page
  forms.js          ← ALL form logic lives here; this is the file to change
  assets/           logo-blue.svg, logo-white.svg, hero.mp4
```

`forms.js` currently does three things:

1. Runs the vehicle-type segmented control on `quote.html` (`#vtype`, buttons with
   `class="vt"` and `data-v`; the selected one carries `on`). Keep this as-is.
2. Reads `?topic=partner` from the URL on `contact.html` and swaps the heading to
   "Become a partner". Keep this — and carry the topic through to the email subject.
3. Builds a `mailto:` string and assigns `window.location.href`. **This is what gets
   replaced.**

### Field IDs already in the markup

`quote.html` — submit button is `#send-quote`:

| id | label |
|---|---|
| `q-name` | Full name |
| `q-phone` | Phone number |
| `q-email` | Email (optional) |
| `q-price` | Price of the car |
| `q-desc` | Describe your car (textarea) |
| `#vtype` | vehicle type — read the `data-v` of the `.vt.on` button |

`contact.html` — submit button is `#send-contact`:

| id | label |
|---|---|
| `c-name` | Full name |
| `c-company` | Company (optional) |
| `c-email` | Email |
| `c-phone` | Phone number |
| `c-msg` | Message (textarea) |

Neither form is wrapped in a `<form>` element — the buttons are plain `<button>` with a
click listener. Wrapping them in `<form>` is optional; if you do, use
`type="submit"` and `e.preventDefault()`, and keep the same ids.

---

## Step 1 — Get a Web3Forms access key

1. Go to https://web3forms.com, enter **rafid@badgerbytesoftware.com**.
2. The access key arrives by email — a UUID like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.
3. Verify the address by clicking the link in that email, or submissions silently drop.

The key is a public client-side key. It only authorises delivery to the verified
address, so committing it is fine. Still, read it from a config constant at the top of
`forms.js` (`const WEB3FORMS_KEY = "...";`) so it is easy to swap later.

Free tier: 250 submissions/month. Enough for launch; note it in the handoff.

---

## Step 2 — Rewrite the submit handlers in `forms.js`

Replace the two `window.location.href = 'mailto:...'` blocks with a shared async POST.

```js
const WEB3FORMS_KEY = "PASTE_KEY_HERE";
const ENDPOINT = "https://api.web3forms.com/submit";

async function submitForm(payload) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ access_key: WEB3FORMS_KEY, ...payload })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Submission failed");
  return data;
}
```

**Quote payload** (`#send-quote`):

```js
{
  subject: `Quote request — ${name || "Carmaxx website"}`,
  from_name: "Carmaxx website",
  replyto: email,                 // Web3Forms uses `replyto`, not `reply_to`
  "Full name": name,
  "Phone": phone,
  "Email": email,
  "Price of the car": price,
  "Vehicle type": vehicleType,    // from .vt.on data-v
  "Car description": description,
  botcheck: ""                    // honeypot, see step 3
}
```

**Contact payload** (`#send-contact`) — subject depends on `?topic=partner`:

```js
{
  subject: isPartner
    ? `Partnership enquiry — ${company || name || "Carmaxx website"}`
    : `Website enquiry — ${name || "Carmaxx website"}`,
  from_name: "Carmaxx website",
  replyto: email,
  "Full name": name,
  "Company": company,
  "Email": email,
  "Phone": phone,
  "Message": message,
  botcheck: ""
}
```

Any extra keys in the JSON body show up as labelled rows in the delivered email, so
use human-readable key names exactly as above.

---

## Step 3 — Validation, states, and anti-spam

Keep all of this in `forms.js`; do not add a CSS framework or new stylesheet. Match the
existing visual language:

- Blue `#0644CC`, hover `#0533A0`
- Border `#E1E6F0`, focus border `#0644CC`
- Muted text `#5A6478`, error red `#D23B2B`, success green `#0E6B44`
- Radii 7–8px, font `'Schibsted Grotesk'` (already loaded)

**Required fields.** Quote: name, phone, price, description. Contact: name, email,
message. On failure, set the offending input's `style.borderColor = '#D23B2B'` and show
one message line under the button. Clear the error styling on next `input`.

**Email format:** simple regex, only when the field is non-empty (quote email is optional).

**Button states.** Disable while in flight and swap the label:
`"Send to Carmaxx"` → `"Sending…"` → on success `"Sent ✓"` (hold ~2s, then reset).
Set `opacity: 0.7` and `cursor: default` while disabled.

**Success.** Replace the form body with a short confirmation panel inside the same
card — heading "Thanks — we'll be in touch", one line of body copy ("We reply within one
business day."), styled with the green `#0E6B44` on `#E9F6EF` used by the "Total you
receive" tile. Do not navigate, do not alert().

**Failure.** Show a red line under the button: "Something went wrong. Please call
1-888-248-5014 or email info@carmaxx.ca." — with both as real `tel:` / `mailto:` links,
so the user is never stranded. Re-enable the button.

**Honeypot.** Add a hidden input named `botcheck` to each form:
`<input type="checkbox" name="botcheck" style="display:none" tabindex="-1" autocomplete="off">`
Web3Forms rejects the submission when it is filled. Send `botcheck: ""` in the JSON
payload for the non-`<form>` path.

**Remove the mailto footnote.** Both forms end with a small grey line reading
"Submitting opens your email app with a message pre-filled to info@carmaxx.ca — just hit
send." Replace it with: "We'll reply to the email or phone number you provide."

---

## Step 4 — Deploy to Vercel

The site is static; no build command, no framework preset.

```bash
cd site
npx vercel          # first run: link/create project, follow prompts
npx vercel --prod   # production deploy
```

When prompted: framework preset **Other**, build command **none**, output directory
**.** (the `site` folder itself is the root).

Optional `site/vercel.json` for clean URLs and long-lived asset caching:

```json
{
  "cleanUrls": true,
  "trailingSlash": false,
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

`cleanUrls` serves `/coverage` for `coverage.html`. The internal links are written as
`coverage.html` and will keep working either way, but if you enable it, consider
rewriting the nav/footer hrefs to extensionless paths for consistency.

If you'd rather deploy from Git: push the repo, import it in the Vercel dashboard, set
**Root Directory** to `site`, framework **Other**, and leave build/output empty.

---

## Step 5 — Test

1. Submit the quote form with every field filled → email arrives at
   rafid@badgerbytesoftware.com with subject `Quote request — <name>` and all six rows.
2. Submit with required fields empty → inline errors, no network request fired.
3. Submit the contact form from `/contact` → subject `Website enquiry — <name>`.
4. Click **Become a partner** on the home page → lands on `/contact?topic=partner`,
   heading reads "Become a partner", submission subject is `Partnership enquiry — …`.
5. Hit **Reply** on a delivered email → it addresses the submitter, not Web3Forms.
6. Throttle the network to offline and submit → the failure message appears, the button
   re-enables, nothing is lost.
7. Check the deployed URL on a phone: the forms, the hero video, and the interactive
   chart on the home page all behave.

---

## Do not change

- The visual design, spacing, copy, or colours of any page beyond what step 3 specifies.
- `chart.js` or the home page chart markup.
- The vehicle-type segmented control markup (`#vtype`, `.vt`, `.vt.on`, `data-v`).
- The `?topic=partner` routing contract between `index.html` and `contact.html`.
- `tel:` and `mailto:` links elsewhere on the site (banner, footer, claims page) — those
  should keep opening the phone dialer and email client.

## Later, when a backend exists

Web3Forms is a launch expedient. When Carmaxx has a server or CRM, swap `ENDPOINT` and
`WEB3FORMS_KEY` for the internal API and keep everything else — validation, states, and
payload shape were written to survive that move. Also revisit: storing submissions,
routing quote vs. partner enquiries to different inboxes, and a privacy-policy line
about form data handling.
