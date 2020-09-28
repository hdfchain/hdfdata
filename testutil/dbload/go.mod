module github.com/hdfchain/hdfdata/testutil/dbload

go 1.12

require (
	github.com/hdfchain/hdfdata/testutil/dbconfig/v2 v2.0.0
	github.com/lib/pq v1.1.0
)

replace github.com/hdfchain/hdfdata/testutil/dbconfig/v2 => ../dbconfig
