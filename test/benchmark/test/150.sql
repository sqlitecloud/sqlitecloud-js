-- CREATE INDEX five times
BEGIN;
CREATE UNIQUE INDEX t1b ON z1(b);
CREATE INDEX t1c ON z1(c);
CREATE UNIQUE INDEX t2b ON z2(b);
CREATE INDEX t2c ON z2(c DESC);
CREATE INDEX t3bc ON t3(b,c);
COMMIT;
