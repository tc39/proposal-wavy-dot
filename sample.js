async function test() {
  console.log('3 =', await '123'~.[2]);
  console.log('function = ', await '123'~.toString);
  console.log('345 =', await '345'~.toString());
  console.log('2 =', await (n => n + 1)~.(1));
  console.log(second, '3');
}

test().then(res => process.exit(0), rej => {
  console.error(rej);
  process.exit(1);
});
