-- 10 SELECTS, LIKE, unindexed
BEGIN;
SELECT count(*), avg(b), sum(length(c)), group_concat(c) FROM z1 WHERE c LIKE '%on%';
SELECT count(*), avg(b), sum(length(c)), group_concat(c) FROM z1 WHERE c LIKE '%tw%';
SELECT count(*), avg(b), sum(length(c)), group_concat(c) FROM z1 WHERE c LIKE '%thre%';
SELECT count(*), avg(b), sum(length(c)), group_concat(c) FROM z1 WHERE c LIKE '%fou%';
SELECT count(*), avg(b), sum(length(c)), group_concat(c) FROM z1 WHERE c LIKE '%fiv%';
SELECT count(*), avg(b), sum(length(c)), group_concat(c) FROM z1 WHERE c LIKE '%si%';
SELECT count(*), avg(b), sum(length(c)), group_concat(c) FROM z1 WHERE c LIKE '%seve%';
SELECT count(*), avg(b), sum(length(c)), group_concat(c) FROM z1 WHERE c LIKE '%eigh%';
SELECT count(*), avg(b), sum(length(c)), group_concat(c) FROM z1 WHERE c LIKE '%nin%';
SELECT count(*), avg(b), sum(length(c)), group_concat(c) FROM z1 WHERE c LIKE '%te%';
COMMIT;
