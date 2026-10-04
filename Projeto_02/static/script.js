// Bolhas de fundo
const box = document.getElementById('bubbles');
for (let i = 0; i < 28; i++) {
  const b = document.createElement('span');
  const s = 6 + Math.random() * 28;
  b.style.cssText = `width:${s}px;height:${s}px;left:${Math.random() * 100}%;animation-duration:${8 + Math.random() * 14}s;animation-delay:${-Math.random() * 20}s`;
  box.appendChild(b);
}

// Máscara de celular
const cel = document.getElementById('celular');
cel.addEventListener('input', () => {
  let d = cel.value.replace(/\D/g, '').slice(0, 11);
  if (d.length > 6) d = d.replace(/^(\d{2})(\d{4,5})(\d{0,4}).*/, '($1) $2-$3');
  else if (d.length > 2) d = d.replace(/^(\d{2})(\d*)/, '($1) $2');
  cel.value = d;
});

// Envio
const form = document.getElementById('form');
const msg = document.getElementById('msg');
const btn = document.getElementById('submit');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.className = 'msg';
  msg.textContent = '';
  btn.disabled = true;
  try {
    const r = await fetch('/api/reservar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const data = await r.json();
    if (r.ok) {
      msg.className = 'msg ok';
      msg.textContent = '🎉 Reserva confirmada! Avisaremos você em breve.';
      form.reset();
    } else {
      msg.className = 'msg err';
      msg.textContent = data.erro || 'Erro ao enviar.';
    }
  } catch {
    msg.className = 'msg err';
    msg.textContent = 'Falha de conexão. Tente novamente.';
  }
  btn.disabled = false;
});
