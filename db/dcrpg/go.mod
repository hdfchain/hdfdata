module github.com/hdfchain/hdfdata/db/dcrpg/v5

go 1.12

replace (
	github.com/hdfchain/hdfdata/db/cache/v3 => ../cache
	github.com/hdfchain/hdfdata/db/dbtypes/v2 => ../dbtypes
	github.com/hdfchain/hdfdata/explorer/types/v2 => ../../explorer/types
	github.com/hdfchain/hdfdata/mempool/v5 => ../../mempool
	github.com/hdfchain/hdfdata/txhelpers/v4 => ../../txhelpers
)

require (
	github.com/chappjc/trylock v1.0.0
	github.com/davecgh/go-spew v1.1.1
	github.com/decred/dcrd/blockchain/stake/v2 v2.0.2
	github.com/decred/dcrd/chaincfg/chainhash v1.0.2
	github.com/decred/dcrd/chaincfg/v2 v2.3.0
	github.com/decred/dcrd/dcrutil/v2 v2.0.1
	github.com/decred/dcrd/rpc/jsonrpc/types/v2 v2.0.0
	github.com/decred/dcrd/rpcclient/v5 v5.0.0
	github.com/decred/dcrd/txscript/v2 v2.1.0
	github.com/decred/dcrd/wire v1.3.0
	github.com/hdfchain/hdfdata/api/types/v5 v5.0.1
	github.com/hdfchain/hdfdata/blockdata/v5 v5.0.1
	github.com/hdfchain/hdfdata/db/cache/v3 v3.0.1
	github.com/hdfchain/hdfdata/db/dbtypes/v2 v2.2.1
	github.com/hdfchain/hdfdata/explorer/types/v2 v2.1.1
	github.com/hdfchain/hdfdata/mempool/v5 v5.0.1
	github.com/hdfchain/hdfdata/rpcutils/v3 v3.0.1
	github.com/hdfchain/hdfdata/semver v1.0.0
	github.com/hdfchain/hdfdata/stakedb/v3 v3.1.1
	github.com/hdfchain/hdfdata/testutil/dbconfig/v2 v2.0.0
	github.com/hdfchain/hdfdata/txhelpers/v4 v4.0.1
	github.com/decred/dcrwallet/wallet/v3 v3.1.1-0.20191230143837-6a86dc4676f0
	github.com/decred/slog v1.0.0
	github.com/dmigwi/go-piparser/proposals v0.0.0-20191219171828-ae8cbf4067e1
	github.com/dustin/go-humanize v1.0.0
	github.com/lib/pq v1.2.0
)
