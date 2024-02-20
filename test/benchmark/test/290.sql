-- Refill two 50000-row tables using REPLACE
REPLACE INTO z2(a,b,c) SELECT a,b,c FROM z1;
REPLACE INTO t3(a,b,c) SELECT a,b,c FROM z1;
