-- 8 INSERTs into table with no index
BEGIN;
CREATE TABLE z99(a INTEGER , b INTEGER , c VARCHAR(200) );
INSERT INTO z99 VALUES(32768,1,'thirty two thousand seven hundred sixty eight');
INSERT INTO z99 VALUES(16384,2,'sixteen thousand three hundred eighty four');
INSERT INTO z99 VALUES(49152,3,'forty nine thousand one hundred fifty two');
INSERT INTO z99 VALUES(8192,4,'eight thousand one hundred ninety two');
INSERT INTO z99 VALUES(40960,5,'forty thousand nine hundred sixty');
INSERT INTO z99 VALUES(24576,6,'twenty four thousand five hundred seventy six');
INSERT INTO z99 VALUES(57344,7,'fifty seven thousand three hundred forty four');
INSERT INTO z99 VALUES(4096,8,'four thousand ninety six');
COMMIT;
