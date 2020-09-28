package dbtypes

import (
	"bytes"
	"encoding/hex"
	"fmt"

	"github.com/decred/dcrd/blockchain/stake/v2"
	"github.com/decred/dcrd/chaincfg/v2"
	"github.com/decred/dcrd/txscript/v2"
	"github.com/decred/dcrd/wire"
	"github.com/hdfchain/hdfdata/txhelpers/v4"
	"github.com/decred/dcrwallet/wallet/v3/txrules"
)

// DevSubsidyAddress returns the development subsidy address for the specified
// network.
func DevSubsidyAddress(params *chaincfg.Params) (string, error) {
	var devSubsidyAddress string
	var err error
	switch params.Name {
	case "testnet2":
		// TestNet2 uses an invalid organization PkScript
		devSubsidyAddress = "TccTkqj8wFqrUemmHMRSx8SYEueQYLmuuFk"
		err = fmt.Errorf("testnet2 has invalid project fund script")
	default:
		_, devSubsidyAddresses, _, err0 := txscript.ExtractPkScriptAddrs(
			params.OrganizationPkScriptVersion, params.OrganizationPkScript, params)
		if err0 != nil || len(devSubsidyAddresses) != 1 {
			err = fmt.Errorf("failed to decode dev subsidy address: %v", err0)
		} else {
			devSubsidyAddress = devSubsidyAddresses[0].String()
		}
	}
	return devSubsidyAddress, err
}

// ExtractBlockTransactions extracts transaction information from a
// wire.MsgBlock and returns the processed information in slices of the dbtypes
// Tx, Vout, and VinTxPropertyARRAY.
func ExtractBlockTransactions(msgBlock *wire.MsgBlock, txTree int8,
	chainParams *chaincfg.Params, isValid, isMainchain bool) ([]*Tx, [][]*Vout, []VinTxPropertyARRAY) {
	dbTxs, dbTxVouts, dbTxVins := processTransactions(msgBlock, txTree,
		chainParams, isValid, isMainchain)
	if txTree != wire.TxTreeRegular && txTree != wire.TxTreeStake {
		fmt.Printf("Invalid transaction tree: %v", txTree)
	}
	return dbTxs, dbTxVouts, dbTxVins
}

func processTransactions(msgBlock *wire.MsgBlock, tree int8, chainParams *chaincfg.Params,
	isValid, isMainchain bool) ([]*Tx, [][]*Vout, []VinTxPropertyARRAY) {

	var txs []*wire.MsgTx
	switch tree {
	case wire.TxTreeRegular:
		txs = msgBlock.Transactions
	case wire.TxTreeStake:
		txs = msgBlock.STransactions
	default:
		return nil, nil, nil
	}

	blockHeight := msgBlock.Header.Height
	blockHash := msgBlock.BlockHash()
	blockTime := NewTimeDef(msgBlock.Header.Timestamp)

	dbTransactions := make([]*Tx, 0, len(txs))
	dbTxVouts := make([][]*Vout, len(txs))
	dbTxVins := make([]VinTxPropertyARRAY, len(txs))

	ticketPrice := msgBlock.Header.SBits

	for txIndex, tx := range txs {
		isStake := txhelpers.IsStakeTx(tx)
		if isStake && tree != wire.TxTreeStake {
			// You are doing it wrong
			return nil, nil, nil
		}
		var mixDenom int64
		var mixCount uint32
		if !isStake {
			_, mixDenom, mixCount = txhelpers.IsMixTx(tx)
			if mixCount == 0 {
				_, mixDenom, mixCount = txhelpers.IsMixedSplitTx(tx, int64(txrules.DefaultRelayFeePerKb), ticketPrice)
			}
		}
		var spent, sent int64
		for _, txin := range tx.TxIn {
			spent += txin.ValueIn
		}
		for _, txout := range tx.TxOut {
			sent += txout.Value
		}
		fees := spent - sent
		dbTx := &Tx{
			BlockHash:        blockHash.String(),
			BlockHeight:      int64(blockHeight),
			BlockTime:        blockTime,
			Time:             blockTime, // TODO, receive time?
			TxType:           int16(stake.DetermineTxType(tx)),
			Version:          tx.Version,
			Tree:             tree,
			TxID:             tx.TxHash().String(),
			BlockIndex:       uint32(txIndex),
			Locktime:         tx.LockTime,
			Expiry:           tx.Expiry,
			Size:             uint32(tx.SerializeSize()),
			Spent:            spent,
			Sent:             sent,
			Fees:             fees,
			MixCount:         int32(mixCount),
			MixDenom:         mixDenom,
			NumVin:           uint32(len(tx.TxIn)),
			NumVout:          uint32(len(tx.TxOut)),
			IsValid:          isValid || tree == wire.TxTreeStake,
			IsMainchainBlock: isMainchain,
		}

		//dbTx.Vins = make([]VinTxProperty, 0, dbTx.NumVin)
		dbTxVins[txIndex] = make(VinTxPropertyARRAY, 0, len(tx.TxIn))
		for idx, txin := range tx.TxIn {
			dbTxVins[txIndex] = append(dbTxVins[txIndex], VinTxProperty{
				PrevOut:     txin.PreviousOutPoint.String(),
				PrevTxHash:  txin.PreviousOutPoint.Hash.String(),
				PrevTxIndex: txin.PreviousOutPoint.Index,
				PrevTxTree:  uint16(txin.PreviousOutPoint.Tree),
				Sequence:    txin.Sequence,
				ValueIn:     txin.ValueIn,
				TxID:        dbTx.TxID,
				TxIndex:     uint32(idx),
				TxType:      dbTx.TxType,
				TxTree:      uint16(dbTx.Tree),
				Time:        blockTime,
				BlockHeight: txin.BlockHeight,
				BlockIndex:  txin.BlockIndex,
				ScriptHex:   txin.SignatureScript,
				IsValid:     dbTx.IsValid,
				IsMainchain: isMainchain,
			})
		}

		//dbTx.VinDbIds = make([]uint64, int(dbTx.NumVin))

		// Vouts and their db IDs
		dbTxVouts[txIndex] = make([]*Vout, 0, len(tx.TxOut))
		//dbTx.Vouts = make([]*Vout, 0, len(tx.TxOut))
		for io, txout := range tx.TxOut {
			vout := Vout{
				TxHash:       dbTx.TxID,
				TxIndex:      uint32(io),
				TxTree:       tree,
				TxType:       dbTx.TxType,
				Value:        uint64(txout.Value),
				Version:      txout.Version,
				ScriptPubKey: txout.PkScript,
				Mixed:        mixDenom == txout.Value, // later, check ticket and vote outputs against the spent outputs' mixed status
			}
			scriptClass, scriptAddrs, reqSigs, err := txscript.ExtractPkScriptAddrs(
				vout.Version, vout.ScriptPubKey, chainParams)
			if err != nil && !bytes.Equal(vout.ScriptPubKey, chainParams.OrganizationPkScript) {
				fmt.Println(len(vout.ScriptPubKey), err, hex.EncodeToString(vout.ScriptPubKey))
			}
			addys := make([]string, 0, len(scriptAddrs))
			for ia := range scriptAddrs {
				addys = append(addys, scriptAddrs[ia].String())
			}
			vout.ScriptPubKeyData.ReqSigs = uint32(reqSigs)
			vout.ScriptPubKeyData.Type = scriptClass.String()
			vout.ScriptPubKeyData.Addresses = addys
			dbTxVouts[txIndex] = append(dbTxVouts[txIndex], &vout)
			//dbTx.Vouts = append(dbTx.Vouts, &vout)
		}

		//dbTx.VoutDbIds = make([]uint64, len(dbTxVouts[txIndex]))

		dbTransactions = append(dbTransactions, dbTx)
	}

	return dbTransactions, dbTxVouts, dbTxVins
}
