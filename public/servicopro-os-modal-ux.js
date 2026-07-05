(function () {
  // ServiçoPro: UX externa da OS desativada.
  // A evolução da OS deve acontecer via React/App.tsx/componentes reais.
  try {
    document.querySelectorAll('.sp-os-backdrop, .sp-os-modal, .sp-os-modal-backdrop').forEach((el) => el.remove());
    document.querySelectorAll('[data-sp-os-placeholder="1"], .sp-os-placeholder-card').forEach((el) => el.remove());
    document.querySelectorAll('[data-sp-os-form-card], [data-sp-os-list-card], [data-sp-os-center-card]').forEach((el) => {
      el.removeAttribute('data-sp-os-form-card');
      el.removeAttribute('data-sp-os-list-card');
      el.removeAttribute('data-sp-os-center-card');
      el.classList.remove('sp-os-fechado', 'sp-os-aberto', 'sp-os-row-selected');
    });

    const style = document.getElementById('servicopro-os-ux-style');
    if (style) style.remove();
  } catch (_erro) {
  }
})();
