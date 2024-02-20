-- 10 SELECTS w/ORDER BY, unindexed
BEGIN;
SELECT a, b, c FROM z1 WHERE c LIKE '%on%' ORDER BY a;
SELECT a, b, c FROM z1 WHERE c LIKE '%tw%' ORDER BY a;
SELECT a, b, c FROM z1 WHERE c LIKE '%thre%' ORDER BY a;
SELECT a, b, c FROM z1 WHERE c LIKE '%fou%' ORDER BY a;
SELECT a, b, c FROM z1 WHERE c LIKE '%fiv%' ORDER BY a;
SELECT a, b, c FROM z1 WHERE c LIKE '%si%' ORDER BY a;
SELECT a, b, c FROM z1 WHERE c LIKE '%seve%' ORDER BY a;
SELECT a, b, c FROM z1 WHERE c LIKE '%eigh%' ORDER BY a;
SELECT a, b, c FROM z1 WHERE c LIKE '%nin%' ORDER BY a;
SELECT a, b, c FROM z1 WHERE c LIKE '%te%' ORDER BY a;
COMMIT;
