-- 8 INSERTs into table with no index
BEGIN;
CREATE TABLE zPollo(a INTEGER , b INTEGER , c VARCHAR(200) );
INSERT INTO zPollo VALUES(32768,1,'thirty two thousand seven hundred sixty eight');
INSERT INTO zPollo VALUES(16384,2,'sixteen thousand three hundred eighty four');
INSERT INTO zPollo VALUES(49152,3,'forty nine thousand one hundred fifty two');
INSERT INTO zPollo VALUES(8192,4,'eight thousand one hundred ninety two');
INSERT INTO zPollo VALUES(40960,5,'forty thousand nine hundred sixty');
INSERT INTO zPollo VALUES(24576,6,'twenty four thousand five hundred seventy six');
INSERT INTO zPollo VALUES(57344,7,'fifty seven thousand three hundred forty four');
INSERT INTO zPollo VALUES(4096,8,'four thousand ninety six');
COMMIT;
