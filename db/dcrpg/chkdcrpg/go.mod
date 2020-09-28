module github.com/hdfchain/hdfdata/db/dcrpg/chkdcrpg

go 1.12

replace (
	github.com/hdfchain/hdfdata/explorer/types/v2 => ../../../explorer/types
	github.com/hdfchain/hdfdata/txhelpers/v4 => ../../../txhelpers
	github.com/hdfchain/hdfdata/v5 => ../../..
)

require (
	github.com/decred/dcrd/chaincfg/v2 v2.3.0
	github.com/decred/dcrd/dcrutil/v2 v2.0.1
	github.com/decred/dcrd/rpcclient/v5 v5.0.0
	github.com/hdfchain/hdfdata/db/dcrpg/v5 v5.0.1
	github.com/hdfchain/hdfdata/rpcutils/v3 v3.0.1
	github.com/hdfchain/hdfdata/stakedb/v3 v3.1.1
	github.com/hdfchain/hdfdata/txhelpers/v4 v4.0.1
	github.com/hdfchain/hdfdata/v5 v5.1.1-0.20191031183729-78e26ce5fc81
	github.com/decred/slog v1.0.0
	github.com/jessevdk/go-flags v1.4.0
	github.com/jrick/logrotate v1.0.0
)
