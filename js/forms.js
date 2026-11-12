// Site forms (contact, job application). Not connected to a server yet.
// DEV HOOK: set window.ZETAQ_SUBMIT = async (formName, FormData) => { ... } to send them (e.g. to the existing zetaq.in API).
(() => {
  // ?subject=... preselects the contact subject (links like contact.html?subject=Demo%20Request:%20LogiQ).
  const want = new URLSearchParams(location.search).get('subject');
  const sel = document.querySelector('select[name="subject"]');
  if (want && sel) {
    const base = want.split(':')[0].trim();
    const opt = [...sel.options].find((o) => o.text === base || (base === 'Pricing Quote' && o.text === 'Pricing Inquiry'));
    if (opt) sel.value = opt.text;
    const msg = document.querySelector('textarea[name="message"]');
    if (msg && want.includes(':')) msg.value = `I'd like a demo of ${want.split(':')[1].trim()}.\n\n`;
  }

  document.querySelectorAll('form[data-form]').forEach((f) => f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const note = f.querySelector('.note'), btn = f.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
      if (window.ZETAQ_SUBMIT) {
        await window.ZETAQ_SUBMIT(f.dataset.form, new FormData(f));
        note.textContent = 'Thank you. Our team will get back to you within 24 hours.';
        f.reset();
      } else {
        note.textContent = 'Preview build: this form is not connected yet, so nothing was sent.';
      }
    } catch {
      note.textContent = 'Something went wrong. Please email support@zetaq.in.';
    }
    note.hidden = false;
    btn.disabled = false;
  }));
})();
