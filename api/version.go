// Copyright (c) 2017-2019, The hdfdata developers
// See LICENSE for details.

package api

// APIVersion is an integer value, incremented for breaking changes
const APIVersion = 1

// CommitHash may be set on the build command line:
// go build -ldflags "-X main.CommitHash=`git rev-parse --short HEAD`"
var CommitHash string
