-- This resets the hdfdata_simnet database.

DROP DATABASE IF EXISTS hdfdata_simnet;
DROP USER IF exists hdfdata_simnet_stooge;

CREATE USER hdfdata_simnet_stooge PASSWORD 'pass';
CREATE DATABASE hdfdata_simnet OWNER hdfdata_simnet_stooge;
