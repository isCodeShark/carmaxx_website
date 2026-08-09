(function(){
  var cv = document.getElementById('rcChart');
  if (!cv || typeof Chart === 'undefined') return;
  var PRICE = 50000, chart, steps = [];
  for (var m = 0; m <= 60; m++) steps.push(m / 12);
  function cashAt(y){ return PRICE * Math.pow(0.40, Math.max(y,0) / 5); }
  function replaceAt(y){ return PRICE * Math.pow(1.03, Math.max(y,0)); }
  function fmt(v){ return '$' + Math.round(v).toLocaleString(); }
  chart = new Chart(cv, {
    type: 'line',
    data: { datasets: [
      { data: [], borderColor: '#0E6B44', borderWidth: 2.5, pointRadius: 0, fill: false, tension: 0.25, parsing: false },
      { data: [], borderColor: '#98A0AE', borderWidth: 2.5, pointRadius: 0, fill: false, tension: 0.25, parsing: false },
      { data: [], borderColor: 'rgba(255,255,255,0)', backgroundColor: 'rgba(6,68,204,0.16)', borderWidth: 0, pointRadius: 0, fill: '+1', tension: 0.25, parsing: false },
      { data: [], borderColor: 'rgba(255,255,255,0)', borderWidth: 0, pointRadius: 0, fill: false, tension: 0.25, parsing: false },
      { data: [], borderColor: 'rgba(90,100,120,0.5)', borderWidth: 1, borderDash: [4,4], pointRadius: 0, fill: false, parsing: false },
      { data: [], showLine: false, pointRadius: 5, pointBackgroundColor: ['#98A0AE', '#0E6B44'], pointBorderColor: 'rgba(255,255,255,0)', pointBorderWidth: 0, parsing: false }
    ] },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      layout: { padding: { top: 26, right: 4, left: 4, bottom: 2 } },
      scales: {
        x: { type: 'linear', min: 0, max: 5, ticks: { display: false }, border: { display: false }, grid: { display: false } },
        y: { min: 0, max: 62000, ticks: { display: false }, border: { display: false }, grid: { color: '#EDF0F6', drawTicks: false } }
      }
    }
  });
  function render(){
    var months = +document.getElementById('rc-time').value, selY = months/12, cash = cashAt(selY), rep = replaceAt(selY), d = chart.data.datasets;
    var before = steps.filter(function(y){ return y <= selY; }).concat(selY > 0 ? [selY] : []);
    d[0].data = steps.map(function(y){ return {x:y, y:replaceAt(y)}; });
    d[1].data = steps.map(function(y){ return {x:y, y:cashAt(y)}; });
    d[2].data = before.map(function(y){ return {x:y, y:replaceAt(y)}; });
    d[3].data = before.map(function(y){ return {x:y, y:cashAt(y)}; });
    d[4].data = [{x:selY,y:0},{x:selY,y:rep*1.12}];
    d[5].data = [{x:selY,y:cash},{x:selY,y:rep}];
    chart.update();
    document.getElementById('timeLabel').textContent = Math.floor(months/12) + 'y ' + (months%12) + 'm';
    document.getElementById('insPay').textContent = fmt(cash);
    document.getElementById('carPay').textContent = fmt(rep - cash);
    document.getElementById('totalPay').textContent = fmt(rep);
    var label = document.getElementById('rc-marker'), box = document.getElementById('rc-box');
    if (label && box) {
      var px = chart.scales.x.getPixelForValue(selY), half = label.offsetWidth/2;
      label.style.left = (Math.max(half, Math.min(box.clientWidth - half, px)) - half) + 'px';
    }
  }
  document.getElementById('rc-time').addEventListener('input', render);
  window.addEventListener('resize', render);
  render();
})();