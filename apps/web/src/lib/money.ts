export const formatMoney = (amount: string) => {
  const [whole, fraction] = amount.split('.');
  return `NT$ ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction}`;
};
