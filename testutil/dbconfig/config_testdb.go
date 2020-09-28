// +build !fullpgdb

package dbconfig

// Test DB server and database config.
const (
	PGTestsHost   = "localhost" // "/run/postgresql" for UNIX socket
	PGTestsPort   = "5432"      // "" for UNIX socket
	PGTestsUser   = "postgres"  // "hdfdata" for full database rather than test data repo
	PGTestsPass   = ""
	PGTestsDBName = "hdfdata_mainnet_test"
)
