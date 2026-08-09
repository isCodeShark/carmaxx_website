(function(){
  // --- Web3Forms delivery ---------------------------------------------------
  // Public client-side access keys (one per form). Safe to ship: each only
  // authorises delivery to the verified address. Swap these when a real backend
  // exists — the payload shape below survives that move.
  var QUOTE_KEY = "9a01cb09-5c50-4d9f-948c-a3729c5db7a7";
  var CONTACT_KEY = "1dd054b9-2968-47b9-8751-a2153aff0755";
  var ENDPOINT = "https://api.web3forms.com/submit";

  // Visual language (matches styles.css)
  var BLUE = '#0644CC', BORDER = '#E1E6F0', ERR = '#D23B2B';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function el(id){ return document.getElementById(id); }
  function val(id){ var e = el(id); return e ? e.value.trim() : ''; }

  // --- Vehicle-type segmented control (quote.html) --------------------------
  var v = 'New vehicle';
  var wrap = el('vtype');
  if (wrap) {
    wrap.addEventListener('click', function(e){
      var b = e.target.closest('.vt'); if (!b) return;
      v = b.getAttribute('data-v');
      Array.prototype.forEach.call(wrap.querySelectorAll('.vt'), function(x){ x.classList.toggle('on', x === b); });
    });
  }

  // --- Partner routing (contact.html) ---------------------------------------
  var partner = /[?&]topic=partner/.test(window.location.search);
  var heading = el('contact-heading');
  if (heading && partner) heading.textContent = 'Become a partner';

  // --- Shared submit --------------------------------------------------------
  async function submitForm(key, payload) {
    var res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(Object.assign({ access_key: key }, payload))
    });
    var data = await res.json();
    if (!data.success) throw new Error(data.message || "Submission failed");
    return data;
  }

  function honeypot() {
    var hp = document.querySelector('input[name="botcheck"]');
    return hp && hp.checked ? '1' : '';
  }

  function clearErrors(ids) {
    ids.forEach(function(id){ var e = el(id); if (e) e.style.borderColor = BORDER; });
  }

  function markError(id) {
    var e = el(id); if (!e) return;
    e.style.borderColor = ERR;
    e.addEventListener('input', function handler(){ e.style.borderColor = BORDER; e.removeEventListener('input', handler); });
  }

  function msgLine(btn) {
    var id = btn.id + '-msg';
    var p = document.getElementById(id);
    if (!p) {
      p = document.createElement('p');
      p.id = id;
      p.style.cssText = 'margin:10px 0 0; font-size:13px; line-height:1.55;';
      btn.parentNode.insertBefore(p, btn.nextSibling);
    }
    return p;
  }

  function successPanel(btn) {
    var card = btn.parentNode;
    setTimeout(function(){
      card.innerHTML =
        '<div style="background:#E9F6EF; border:1px solid #CDEBD9; border-radius:10px; padding:22px 24px;">' +
          '<h2 style="margin:0; font-size:20px; letter-spacing:-0.02em; font-weight:700; color:#0E6B44;">Thanks &#8212; we&#8217;ll be in touch</h2>' +
          '<p style="margin:8px 0 0; font-size:15px; line-height:1.6; color:#0E6B44;">We reply within one business day.</p>' +
        '</div>';
    }, 700);
  }

  function send(key, btn, payload) {
    var original = btn.textContent;
    var msg = msgLine(btn); msg.textContent = '';
    btn.disabled = true;
    btn.style.opacity = '0.7';
    btn.style.cursor = 'default';
    btn.textContent = 'Sending…';

    submitForm(key, payload).then(function(){
      btn.textContent = 'Sent ✓';
      successPanel(btn);
    }).catch(function(){
      btn.textContent = original;
      btn.disabled = false;
      btn.style.opacity = '';
      btn.style.cursor = 'pointer';
      msg.style.color = ERR;
      msg.innerHTML = 'Something went wrong. Please call ' +
        '<a href="tel:18882485014" style="color:' + BLUE + '; font-weight:600;">1-888-248-5014</a> or email ' +
        '<a href="mailto:info@carmaxx.ca" style="color:' + BLUE + '; font-weight:600;">info@carmaxx.ca</a>.';
    });
  }

  // --- Quote form (quote.html) ----------------------------------------------
  var qb = el('send-quote');
  if (qb) qb.addEventListener('click', function(){
    var required = ['q-name', 'q-phone', 'q-price', 'q-desc'];
    clearErrors(required.concat(['q-email']));
    var msg = msgLine(qb); msg.textContent = '';

    var bad = false;
    required.forEach(function(id){ if (!val(id)) { markError(id); bad = true; } });
    var email = val('q-email');
    if (email && !EMAIL_RE.test(email)) { markError('q-email'); bad = true; }
    if (bad) { msg.style.color = ERR; msg.textContent = 'Please complete the highlighted fields.'; return; }

    var name = val('q-name');
    send(QUOTE_KEY, qb, {
      subject: 'Quote request — ' + (name || 'Carmaxx website'),
      from_name: 'Carmaxx website',
      replyto: email,
      'Full name': name,
      'Phone': val('q-phone'),
      'Email': email,
      'Price of the car': val('q-price'),
      'Vehicle type': v,
      'Car description': val('q-desc'),
      botcheck: honeypot()
    });
  });

  // --- Contact form (contact.html) ------------------------------------------
  var cb = el('send-contact');
  if (cb) cb.addEventListener('click', function(){
    var required = ['c-name', 'c-email', 'c-msg'];
    clearErrors(required);
    var msg = msgLine(cb); msg.textContent = '';

    var bad = false;
    required.forEach(function(id){ if (!val(id)) { markError(id); bad = true; } });
    var email = val('c-email');
    if (email && !EMAIL_RE.test(email)) { markError('c-email'); bad = true; }
    if (bad) { msg.style.color = ERR; msg.textContent = 'Please complete the highlighted fields.'; return; }

    var name = val('c-name'), company = val('c-company');
    send(CONTACT_KEY, cb, {
      subject: partner
        ? 'Partnership enquiry — ' + (company || name || 'Carmaxx website')
        : 'Website enquiry — ' + (name || 'Carmaxx website'),
      from_name: 'Carmaxx website',
      replyto: email,
      'Full name': name,
      'Company': company,
      'Email': email,
      'Phone': val('c-phone'),
      'Message': val('c-msg'),
      botcheck: honeypot()
    });
  });

  // --- Copy-email buttons (contact.html, about.html) ------------------------
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.position = 'absolute'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  Array.prototype.forEach.call(document.querySelectorAll('.copy-email'), function(btn){
    btn.addEventListener('click', function(){
      var addr = btn.getAttribute('data-email') || '';
      var label = btn.querySelector('.copy-email-label');
      var original = label ? label.textContent : '';
      function flash(){
        if (!label) return;
        label.textContent = 'Copied ✓';
        btn.style.borderColor = '#0E6B44';
        btn.style.color = '#0E6B44';
        setTimeout(function(){
          label.textContent = original;
          btn.style.borderColor = '';
          btn.style.color = '';
        }, 1600);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(addr).then(flash).catch(function(){ fallbackCopy(addr); flash(); });
      } else {
        fallbackCopy(addr); flash();
      }
    });
  });
})();
