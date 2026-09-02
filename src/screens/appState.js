// Estado compartido de la UI (evita imports circulares entre app.js y pantallas).
import { todayMonthKey } from '../format.js';

export const store = {
  data: null, // AppData actual (se asigna en app.js al cargar)
};

export const state = {
  view: 'dashboard', // dashboard | movements | card | funds | more
  moreView: 'menu', // menu | services | goals | budget | assets | reports | settings
  month: todayMonthKey(),
  budgetMonth: todayMonthKey(),
  reportsMonth: todayMonthKey(),
  typeFilter: 'all', // all | expense | income | transfer | creditPayment
  query: '',
  modal: null, // {kind: 'newTx'|'fundMove'|..., ...}
  toast: null,
};
