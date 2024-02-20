-- subquery in result set
SELECT sum(a), max(c), avg((SELECT a FROM z2 WHERE 5+z2.b=z1.b) AND a<15000), max(c) FROM z1 WHERE a<15000;
