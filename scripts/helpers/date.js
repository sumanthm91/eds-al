export const convertToLocalTime = (date) => {
  const utc = new Date(date);
  const offset = utc.getTimezoneOffset();
  return new Date(utc.getTime() + offset * 60000);
};

export default { convertToLocalTime };
