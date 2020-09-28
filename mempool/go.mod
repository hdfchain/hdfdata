module github.com/hdfchain/hdfdata/mempool/v5

go 1.12

require (
	github.com/decred/dcrd/blockchain/stake/v2 v2.0.2
	github.com/decred/dcrd/blockchain/standalone v1.1.0
	github.com/decred/dcrd/chaincfg/chainhash v1.0.2
	github.com/decred/dcrd/chaincfg/v2 v2.3.0
	github.com/decred/dcrd/dcrutil/v2 v2.0.1
	github.com/decred/dcrd/rpc/jsonrpc/types/v2 v2.0.0
	github.com/decred/dcrd/rpcclient/v5 v5.0.0
	github.com/hdfchain/hdfdata/api/types/v5 v5.0.1
	github.com/hdfchain/hdfdata/db/dbtypes/v2 v2.2.1
	github.com/hdfchain/hdfdata/explorer/types/v2 v2.1.1
	github.com/hdfchain/hdfdata/pubsub/types/v3 v3.0.5
	github.com/hdfchain/hdfdata/rpcutils/v3 v3.0.1
	github.com/hdfchain/hdfdata/txhelpers/v4 v4.0.1
	github.com/decred/slog v1.0.0
	github.com/dustin/go-humanize v1.0.0
)

replace github.com/hdfchain/hdfdata/explorer/types/v2 => ../explorer/types
