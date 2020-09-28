module github.com/hdfchain/hdfdata/v5

go 1.12

require (
	github.com/caarlos0/env v3.5.0+incompatible
	github.com/chappjc/logrus-prefix v0.0.0-20180227015900-3a1d64819adb
	github.com/decred/dcrd/blockchain/standalone v1.1.0
	github.com/decred/dcrd/chaincfg/chainhash v1.0.2
	github.com/decred/dcrd/chaincfg/v2 v2.3.0
	github.com/decred/dcrd/dcrec v1.0.0
	github.com/decred/dcrd/dcrutil/v2 v2.0.1
	github.com/decred/dcrd/rpc/jsonrpc/types/v2 v2.0.0
	github.com/decred/dcrd/rpcclient/v5 v5.0.0
	github.com/decred/dcrd/txscript/v2 v2.1.0
	github.com/decred/dcrd/wire v1.3.0
	github.com/hdfchain/hdfdata/api/types/v5 v5.0.1
	github.com/hdfchain/hdfdata/blockdata/v5 v5.0.1
	github.com/hdfchain/hdfdata/db/cache/v3 v3.0.1
	github.com/hdfchain/hdfdata/db/dbtypes/v2 v2.2.1
	github.com/hdfchain/hdfdata/db/dcrpg/v5 v5.0.1
	github.com/hdfchain/hdfdata/exchanges/v2 v2.1.0
	github.com/hdfchain/hdfdata/explorer/types/v2 v2.1.1
	github.com/hdfchain/hdfdata/gov/v3 v3.0.0
	github.com/hdfchain/hdfdata/mempool/v5 v5.0.2
	github.com/hdfchain/hdfdata/middleware/v3 v3.1.0
	github.com/hdfchain/hdfdata/pubsub/types/v3 v3.0.5
	github.com/hdfchain/hdfdata/pubsub/v4 v4.0.1
	github.com/hdfchain/hdfdata/rpcutils/v3 v3.0.1
	github.com/hdfchain/hdfdata/semver v1.0.0
	github.com/hdfchain/hdfdata/stakedb/v3 v3.1.1
	github.com/hdfchain/hdfdata/txhelpers/v4 v4.0.1
	github.com/decred/slog v1.0.0
	github.com/dmigwi/go-piparser/proposals v0.0.0-20191219171828-ae8cbf4067e1
	github.com/dustin/go-humanize v1.0.0
	github.com/go-chi/chi v4.1.0+incompatible
	github.com/google/gops v0.3.7-0.20190802051910-59c8be2eaddf
	github.com/googollee/go-engine.io v1.4.3-0.20190924125625-798118fc0dd2
	github.com/googollee/go-socket.io v1.4.3-0.20191016204530-42fe90fa9ed0
	github.com/jessevdk/go-flags v1.4.0
	github.com/jrick/logrotate v1.0.0
	github.com/konsorten/go-windows-terminal-sequences v1.0.2 // indirect
	github.com/mattn/go-colorable v0.1.1 // indirect
	github.com/mgutz/ansi v0.0.0-20170206155736-9520e82c474b // indirect
	github.com/rs/cors v1.7.0
	github.com/shiena/ansicolor v0.0.0-20151119151921-a422bbe96644
	github.com/sirupsen/logrus v1.3.0
	github.com/x-cray/logrus-prefixed-formatter v0.5.2 // indirect
	golang.org/x/net v0.0.0-20191028085509-fe3aa8a45271
)

replace (
	github.com/hdfchain/hdfdata/api/types/v5 => ./api/types
	github.com/hdfchain/hdfdata/blockdata/v5 => ./blockdata
	github.com/hdfchain/hdfdata/db/cache/v3 => ./db/cache
	github.com/hdfchain/hdfdata/db/dbtypes/v2 => ./db/dbtypes
	github.com/hdfchain/hdfdata/db/dcrpg/v5 => ./db/dcrpg
	github.com/hdfchain/hdfdata/dcrrates => ./dcrrates
	github.com/hdfchain/hdfdata/exchanges/v2 => ./exchanges
	github.com/hdfchain/hdfdata/explorer/types/v2 => ./explorer/types
	github.com/hdfchain/hdfdata/gov/v3 => ./gov
	github.com/hdfchain/hdfdata/mempool/v5 => ./mempool
	github.com/hdfchain/hdfdata/middleware/v3 => ./middleware
	github.com/hdfchain/hdfdata/pubsub/types/v3 => ./pubsub/types
	github.com/hdfchain/hdfdata/pubsub/v4 => ./pubsub
	github.com/hdfchain/hdfdata/rpcutils/v3 => ./rpcutils
	github.com/hdfchain/hdfdata/semver => ./semver
	github.com/hdfchain/hdfdata/stakedb/v3 => ./stakedb
	github.com/hdfchain/hdfdata/testutil/dbconfig/v2 => ./testutil/dbconfig
	github.com/hdfchain/hdfdata/txhelpers/v4 => ./txhelpers
)
