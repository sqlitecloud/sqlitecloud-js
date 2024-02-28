# runs benchmark scripts which are fairly heavy in a continuous loop
while true; do
   npm test 1brc.test.ts
   sleep 2
done

