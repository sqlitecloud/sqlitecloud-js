import { format } from 'date-fns';

const logThis = (msg) => {
  let prefix = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSS");
  console.log(prefix + " - " + msg);
}
export { logThis };