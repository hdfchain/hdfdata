module github.com/hdfchain/hdfdata/pubsub/democlient

go 1.12

replace (
	github.com/hdfchain/hdfdata/pubsub/v4 => ../
	github.com/hdfchain/hdfdata/explorer/types/v2 => ../../explorer/types
)

require (
	github.com/decred/dcrd/chaincfg/v2 v2.3.0
	github.com/decred/dcrd/dcrutil/v2 v2.0.1
	github.com/hdfchain/hdfdata/explorer/types/v2 v2.1.1
	github.com/hdfchain/hdfdata/pubsub/types/v3 v3.0.5
	github.com/hdfchain/hdfdata/pubsub/v4 v4.0.1
	github.com/hdfchain/hdfdata/semver v1.0.0
	github.com/decred/slog v1.0.0
	github.com/google/go-cmp v0.3.0 // indirect
	github.com/jessevdk/go-flags v1.4.0
	github.com/kr/pty v1.1.4 // indirect
	golang.org/x/crypto v0.0.0-20190611184440-5c40567a22f8 // indirect
	google.golang.org/genproto v0.0.0-20190502173448-54afdca5d873 // indirect
	gopkg.in/AlecAivazis/survey.v1 v1.8.2
)
