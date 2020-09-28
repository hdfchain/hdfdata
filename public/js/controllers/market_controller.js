import { Controller } from 'stimulus'
import TurboQuery from '../helpers/turbolinks_helper'
import { getDefault } from '../helpers/module_helper'
import humanize from '../helpers/humanize_helper'
import { darkEnabled } from '../services/theme_service'
import globalEventBus from '../services/event_bus_service'
import axios from 'axios'

var Dygraph
const SELL = 1
const BUY = 2
const candlestick = 'candlestick'
const orders = 'orders'
const depth = 'depth'
const history = 'history'
const volume = 'volume'
const aggregatedKey = 'aggregated'
const anHour = '1h'
const minuteMap = {
  '30m': 30,
  '1h': 60,
  '1d': 1440,
  '1mo': 43200
}
const PIPI = 2 * Math.PI
const prettyDurations = {
  '30m': '30 min',
  '1h': 'hour',
  '1d': 'day',
  '1mo': 'month'
}
const exchangeLinks = {
  binance: 'https://www.binance.com/en/trade/HDF_BTC',
  bittrex: 'https://bittrex.com/Market/Index?MarketName=BTC-HDF',
  poloniex: 'https://poloniex.com/exchange#btc_hdf',
  dragonex: 'https://dragonex.io/en-us/trade/index/hdf_btc',
  huobi: 'https://www.hbg.com/en-us/exchange/?s=hdf_btc'
}
const defaultZoomPct = 20
var hidden, visibilityChange
if (typeof document.hidden !== 'undefined') { // Opera 12.10 and Firefox 18 and later support
  hidden = 'hidden'
  visibilityChange = 'visibilitychange'
} else if (typeof document.msHidden !== 'undefined') {
  hidden = 'msHidden'
  visibilityChange = 'msvisibilitychange'
} else if (typeof document.webkitHidden !== 'undefined') {
  hidden = 'webkitHidden'
  visibilityChange = 'webkitvisibilitychange'
}
var focused = true
var aggStacking = true
var refreshAvailable = false
var availableCandlesticks, availableDepths

function screenIsBig () {
  return window.innerWidth >= 992
}

function validDepthExchange (token) {
  return availableDepths.indexOf(token) > -1
}

function hasBin (xc, bin) {
  return availableCandlesticks[xc].indexOf(bin) !== -1
}

function usesOrderbook (chart) {
  return chart === depth || chart === orders
}

function usesCandlesticks (chart) {
  return chart === candlestick || chart === volume || chart === history
}

var requestCounter = 0
var responseCache = {}

function hasCache (k) {
  if (!responseCache[k]) return false
  var expiration = new Date(responseCache[k].data.expiration)
  return expiration > new Date()
}

function clearCache (k) {
  if (!responseCache[k]) return
  delete responseCache[k]
}

const lightStroke = '#333'
const darkStroke = '#ddd'
var chartStroke = lightStroke
var conversionFactor = 1
var btcPrice, fiatCode
var gridColor = '#7774'
var settings = {}

var colorNumerator = 0
var colorDenominator = 1
var hslS = '100%'
var hslL = '50%'
var hslOffset = 225 // 0 <= x < 360
var exchangeHues = {}
var hsl = (h) => `hsl(${(h + hslOffset) % 360},${hslS},${hslL})`
// Generates colors on the hue sequence 0, 1/2, 1/4, 3/4, 1/8, 3/8, 5/8, 7/8, 1/16, ...
function generateHue () {
  if (colorNumerator >= colorDenominator) {
    colorNumerator = 1 // reset the numerator
    colorDenominator *= 2 // double the denominator
    if (colorDenominator >= 512) { // Will generate 256 different hues
      colorNumerator = 0
      colorDenominator = 1
    }
    return generateHue()
  }
  let hue = colorNumerator / colorDenominator * 360
  colorNumerator += 2
  return hsl(hue)
}

function getHue (token) {
  if (exchangeHues[token]) return exchangeHues[token]
  exchangeHues[token] = generateHue()
  return exchangeHues[token]
}

const commonChartOpts = {
  gridLineColor: gridColor,
  axisLineColor: 'transparent',
  underlayCallback: (ctx, area, dygraph) => {
    ctx.lineWidth = 1
    ctx.strokeStyle = gridColor
    ctx.strokeRect(area.x, area.y, area.w, area.h)
  },
  // these should be set to avoid Dygraph strangeness
  labels: [' ', ' '], // To avoid an annoying console message,
  xlabel: ' ',
  ylabel: ' ',
  pointSize: 6
}

const chartResetOpts = {
  fillGraph: false,
  strokeWidth: 2,
  drawPoints: false,
  logscale: false,
  xRangePad: 0,
  yRangePad: 0,
  stackedGraph: false,
  zoomCallback: null
}

function convertedThreeSigFigs (x) {
  return humanize.threeSigFigs(x * conversionFactor)
}

function convertedEightDecimals (x) {
  return (x * conversionFactor).toFixed(8)
}

function adjustAxis (axis, zoomInPercentage, bias) {
  var delta = axis[1] - axis[0]
  var increment = delta * zoomInPercentage
  var foo = [increment * bias, increment * (1 - bias)]
  return [axis[0] + foo[0], axis[1] - foo[1]]
}

function gScroll (event, g, context) {
  var percentage = event.detail ? event.detail * -1 / 1000 : event.wheelDelta ? event.wheelDelta / 1000 : event.deltaY / -25

  if (!(event.offsetX && event.offsetY)) {
    event.offsetX = event.layerX - event.target.offsetLeft
    event.offsetY = event.layerY - event.target.offsetTop
  }

  var xOffset = g.toDomCoords(g.xAxisRange()[0], null)[0]
  var x = event.offsetX - xOffset
  var w = g.toDomCoords(g.xAxisRange()[1], null)[0] - xOffset
  var xPct = w === 0 ? 0 : (x / w)
  var newWindow = adjustAxis(g.xAxisRange(), percentage, xPct)
  g.updateOptions({
    dateWindow: newWindow
  })
  var zoomCallback = g.getOption('zoomCallback')
  if (zoomCallback) zoomCallback(newWindow[0], newWindow[1], g.yAxisRanges())
  event.preventDefault()
  event.stopPropagation()
}

function orderbookStats (bids, asks) {
  var bidEdge = bids[0].price
  var askEdge = asks[0].price
  return {
    bidEdge: bidEdge,
    askEdge: askEdge,
    gap: askEdge - bidEdge,
    midGap: (bidEdge + askEdge) / 2
  }
}

var dummyOrderbook = {
  pts: [[0, 0, 0]],
  outliers: {
    asks: [],
    bids: []
  }
}

function sizedArray (len, v) {
  var a = []
  for (let i = 0; i < len; i++) {
    a.push(v)
  }
  return a
}

function rangedPts (pts, cutoff) {
  var l = []
  var outliers = []
  pts.forEach(pt => {
    if (cutoff(pt)) {
      outliers.push(pt)
      return
    }
    l.push(pt)
  })
  return { pts: l, outliers: outliers }
}

function translateDepthSide (pts, idx, cutoff) {
  var sorted = rangedPts(pts, cutoff)
  var accumulator = 0
  var translated = sorted.pts.map(pt => {
    accumulator += pt.quantity
    pt = [pt.price, null, null]
    pt[idx] = accumulator
    return pt
  })
  return { pts: translated, outliers: sorted.outliers }
}

function translateDepthPoint (pt, offset, accumulator) {
  var l = sizedArray(pt.volumes.length + 1, null)
  l[0] = pt.price
  pt.volumes.forEach((vol, i) => {
    accumulator[i] += vol
    l[offset + i + 1] = accumulator[i]
  })
  return l
}

function needsDummyPoint (pt, offset, accumulator) {
  var xcCount = pt.volumes.length
  for (let i = 0; i < xcCount; i++) {
    if (pt.volumes[i] && accumulator[i] === 0) return { price: pt.price + offset, volumes: sizedArray(xcCount, 0) }
  }
  return false
}

function translateAggregatedDepthSide (pts, idx, cutoff) {
  var sorted = rangedPts(pts, cutoff)
  var xcCount = pts[0].volumes.length
  var offset = idx === SELL ? 0 : xcCount
  var zeroWidth = idx === SELL ? -1e-8 : 1e-8
  var xcAccumulator = sizedArray(xcCount, 0)
  var l = []
  sorted.pts.forEach(pt => {
    let zeros = needsDummyPoint(pt, zeroWidth, xcAccumulator)
    if (zeros) {
      l.push(translateDepthPoint(zeros, offset, xcAccumulator))
    }
    l.push(translateDepthPoint(pt, offset, xcAccumulator))
  })
  return { pts: l, outliers: sorted.outliers }
}

function translateOrderbookSide (pts, idx, cutoff) {
  var sorted = rangedPts(pts, cutoff)
  var translated = sorted.pts.map(pt => {
    let l = [pt.price, null, null]
    l[idx] = pt.quantity
    return l
  })
  return { pts: translated, outliers: sorted.outliers }
}

function sumPt (pt) {
  return pt.volumes.reduce((a, v) => { return a + v }, 0)
}

function translateAggregatedOrderbookSide (pts, idx, cutoff) {
  var sorted = rangedPts(pts, cutoff)
  var translated = sorted.pts.map(pt => {
    let l = [pt.price, null, null]
    l[idx] = sumPt(pt)
    return l
  })
  return { pts: translated, outliers: sorted.outliers }
}

function processOrderbook (response, translator) {
  var bids = response.data.bids
  var asks = response.data.asks
  if (!response.tokens) {
    // Add the dummy points to make the chart line connect to the baseline and
    // because otherwise Dygraph has a bug that adds an offset to the asks side.
    bids.splice(0, 0, { price: bids[0].price + 1e-8, quantity: 0 })
    asks.splice(0, 0, { price: asks[0].price - 1e-8, quantity: 0 })
  }
  if (!bids || !asks) {
    console.warn('no bid/ask data in API response')
    return dummyOrderbook
  }
  if (!bids.length || !asks.length) {
    console.warn('empty bid/ask data in API response')
    return dummyOrderbook
  }
  var stats = orderbookStats(bids, asks)
  var cutoff = 0.1 * stats.midGap // Low cutoff of 10% market.
  var buys = translator(bids, BUY, pt => pt.price < cutoff)
  buys.pts.reverse()
  cutoff = stats.midGap * 2 // Hard cutoff of 2 * market price
  var sells = translator(asks, SELL, pt => pt.price > cutoff)
  return {
    pts: buys.pts.concat(sells.pts),
    outliers: buys.outliers.concat(sells.outliers),
    stats: stats
  }
}

function candlestickPlotter (e) {
  if (e.seriesIndex !== 0) return

  var area = e.plotArea
  var ctx = e.drawingContext
  ctx.strokeStyle = chartStroke
  ctx.lineWidth = 1
  var sets = e.allSeriesPoints
  if (sets.length < 2) {
    // do nothing
    return
  }

  var barWidth = area.w * Math.abs(sets[0][1].x - sets[0][0].x) * 0.8
  let opens, closes, highs, lows
  [opens, closes, highs, lows] = sets
  let open, close, high, low
  for (let i = 0; i < sets[0].length; i++) {
    ctx.strokeStyle = '#777'
    open = opens[i]
    close = closes[i]
    high = highs[i]
    low = lows[i]
    var centerX = area.x + open.x * area.w
    var topY = area.h * high.y + area.y
    var bottomY = area.h * low.y + area.y
    ctx.beginPath()
    ctx.moveTo(centerX, topY)
    ctx.lineTo(centerX, bottomY)
    ctx.stroke()
    ctx.strokeStyle = 'black'
    var top
    if (open.yval > close.yval) {
      ctx.fillStyle = '#f93f39cc'
      top = area.h * open.y + area.y
    } else {
      ctx.fillStyle = '#1acc84cc'
      top = area.h * close.y + area.y
    }
    var h = area.h * Math.abs(open.y - close.y)
    var left = centerX - barWidth / 2
    ctx.fillRect(left, top, barWidth, h)
    ctx.strokeRect(left, top, barWidth, h)
  }
}

function drawOrderPt (ctx, pt) {
  return drawPt(ctx, pt, orderPtSize, true)
}

function drawPt (ctx, pt, size, bordered) {
  ctx.beginPath()
  ctx.arc(pt.x, pt.y, size, 0, PIPI)
  ctx.fill()
  if (bordered) ctx.stroke()
}

function drawLine (ctx, start, end) {
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(end.x, end.y)
  ctx.stroke()
}

function makePt (x, y) { return { x: x, y: y } }

function canvasXY (area, pt) {
  return {
    x: area.x + pt.x * area.w,
    y: area.y + pt.y * area.h
  }
}

var orderPtSize = 7
if (!screenIsBig()) orderPtSize = 4

function orderPlotter (e) {
  if (e.seriesIndex !== 0) return

  var area = e.plotArea
  var ctx = e.drawingContext

  let buyColor, sellColor
  [buyColor, sellColor] = e.dygraph.getColors()

  let buys, sells
  [buys, sells] = e.allSeriesPoints
  ctx.lineWidth = 1
  ctx.strokeStyle = darkEnabled() ? 'black' : 'white'
  for (let i = 0; i < buys.length; i++) {
    let buy = buys[i]
    let sell = sells[i]
    if (buy) {
      ctx.fillStyle = buyColor
      drawOrderPt(ctx, canvasXY(area, buy))
    }
    if (sell) {
      ctx.fillStyle = sellColor
      drawOrderPt(ctx, canvasXY(area, sell))
    }
  }
}

const greekCapDelta = String.fromCharCode(916)

function depthLegendPlotter (e) {
  var tokens = e.dygraph.getOption('tokens')
  var stats = e.dygraph.getOption('stats')

  var area = e.plotArea
  var ctx = e.drawingContext

  var dark = darkEnabled()
  var big = screenIsBig()
  var mg = e.dygraph.toDomCoords(stats.midGap, 0)
  var midGap = makePt(mg[0], mg[1])
  var fontSize = big ? 15 : 13
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.font = `${fontSize}px arial`
  ctx.lineWidth = 1
  ctx.strokeStyle = chartStroke
  var boxColor = dark ? '#2228' : '#fff8'

  var deltaPctTxt = `${greekCapDelta} : ${humanize.threeSigFigs(stats.gap / stats.midGap * 100)}%`
  var fiatGapTxt = `${humanize.threeSigFigs(stats.gap * btcPrice)} ${fiatCode}`
  var btcGapTxt = `${humanize.threeSigFigs(stats.gap)} BTC`
  var boxW = 0
  var txts = [fiatGapTxt, btcGapTxt, deltaPctTxt]
  txts.forEach(txt => {
    let w = ctx.measureText(txt).width
    if (w > boxW) boxW = w
  })
  var rowHeight = fontSize * 1.5
  var rowPad = big ? (rowHeight - fontSize) / 2 : (rowHeight - fontSize) / 3
  var boxPad = big ? rowHeight / 3 : rowHeight / 5
  var x
  var y = big ? fontSize * 2 : fontSize

  // If it's an aggregated chart, start with a color legend
  if (tokens) {
    // If this is an aggregated chart, draw the color legend first
    let ptSize = fontSize / 3
    let legW = 0
    tokens.forEach(token => {
      let w = ctx.measureText(token).width + rowHeight// leave space for dot
      if (w > legW) legW = w
    })
    x = midGap.x - legW / 2
    let boxH = rowHeight * tokens.length
    ctx.fillStyle = boxColor
    let rect = makePt(x - boxPad, y - boxPad)
    let dims = makePt(legW + boxPad * 4, boxH + boxPad * 2)
    ctx.fillRect(rect.x, rect.y, dims.x, dims.y)
    ctx.strokeRect(rect.x, rect.y, dims.x, dims.y)
    tokens.forEach(token => {
      ctx.fillStyle = getHue(token)
      drawPt(ctx, makePt(x + rowHeight / 2, y + rowHeight / 2 - 1), ptSize)
      ctx.fillStyle = chartStroke
      ctx.fillText(token, x + rowPad + rowHeight, y + rowPad)
      y += rowHeight
    })
    y += boxPad * 3
  } else {
    y += area.h / 4
    x = midGap.x - boxW / 2 - 25
  }
  // Label the gap size.
  rowHeight -= 2 // just looks better
  ctx.fillStyle = boxColor
  let rect = makePt(x - boxPad, y - boxPad)
  let dims = makePt(boxW + boxPad * 3, rowHeight * 3 + boxPad * 2)
  ctx.fillRect(rect.x, rect.y, dims.x, dims.y)
  ctx.strokeRect(rect.x, rect.y, dims.x, dims.y)
  ctx.fillStyle = chartStroke
  ctx.fillText(deltaPctTxt, x + rowPad, y + rowPad)
  ctx.fillText(fiatGapTxt, x + rowPad, y + rowPad + rowHeight)
  ctx.fillText(btcGapTxt, x + rowPad, y + rowPad + 2 * rowHeight)
  // Draw a line from the box to the gap
  drawLine(ctx,
    makePt(x + boxW / 2, y + rowHeight * 3 + boxPad * 2 + boxPad),
    makePt(midGap.x, midGap.y - boxPad))
}

function depthPlotter (e) {
  Dygraph.Plotters.fillPlotter(e)
  var tokens = e.dygraph.getOption('tokens')
  if (tokens && e.dygraph.getOption('stackedGraph')) {
    if (e.seriesIndex === 0 || e.seriesIndex === tokens.length) {
      e.color = chartStroke
    } else {
      e.color = 'transparent'
    }
  }
  Dygraph.Plotters.linePlotter(e)

  // Callout box with color legend
  if (e.seriesIndex === e.allSeriesPoints.length - 1) depthLegendPlotter(e)
}

var stickZoom, orderZoom
function calcStickWindow (start, end, bin) {
  var halfBin = minuteMap[bin] / 2
  start = new Date(start.getTime())
  end = new Date(end.getTime())
  return [
    start.setMinutes(start.getMinutes() - halfBin),
    end.setMinutes(end.getMinutes() + halfBin)
  ]
}

export default class extends Controller {
  static get targets () {
    return ['chartSelect', 'exchanges', 'bin', 'chart', 'legend', 'conversion',
      'xcName', 'xcLogo', 'actions', 'sticksOnly', 'depthOnly', 'chartLoader',
      'xcRow', 'xcIndex', 'price', 'age', 'ageSpan', 'link', 'aggOption',
      'aggStack', 'zoom']
  }

  async connect () {
    this.query = new TurboQuery()
    settings = TurboQuery.nullTemplate(['chart', 'xc', 'bin'])
    this.query.update(settings)
    this.processors = {
      orders: this.processOrders,
      candlestick: this.processCandlesticks,
      history: this.processHistory,
      depth: this.processDepth.bind(this),
      volume: this.processVolume
    }
    commonChartOpts.labelsDiv = this.legendTarget
    this.converted = false
    btcPrice = parseFloat(this.conversionTarget.dataset.factor)
    fiatCode = this.conversionTarget.dataset.code
    this.binButtons = this.binTarget.querySelectorAll('button')
    this.lastUrl = null
    this.zoomButtons = this.zoomTarget.querySelectorAll('button')
    this.zoomCallback = this._zoomCallback.bind(this)

    availableCandlesticks = {}
    availableDepths = []
    this.exchangeOptions = []
    var opts = this.exchangesTarget.options
    for (let i = 0; i < opts.length; i++) {
      let option = opts[i]
      this.exchangeOptions.push(option)
      if (option.dataset.sticks) {
        availableCandlesticks[option.value] = option.dataset.bins.split(';')
      }
      if (option.dataset.depth) availableDepths.push(option.value)
    }

    this.chartOptions = []
    opts = this.chartSelectTarget.options
    for (let i = 0; i < opts.length; i++) {
      this.chartOptions.push(opts[i])
    }

    if (settings.chart == null) {
      settings.chart = depth
    }
    if (settings.xc == null) {
      settings.xc = usesOrderbook(settings.chart) ? aggregatedKey : 'binance'
    }
    if (settings.stack) {
      settings.stack = parseInt(settings.stack)
      if (settings.stack === 0) aggStacking = false
    }
    this.setExchangeName()
    if (settings.bin == null) {
      settings.bin = anHour
    }

    this.setButtons()

    this.resize = this._resize.bind(this)
    window.addEventListener('resize', this.resize)
    this.tabVis = this._tabVis.bind(this)
    document.addEventListener(visibilityChange, this.tabVis)
    this.processNightMode = this._processNightMode.bind(this)
    globalEventBus.on('NIGHT_MODE', this.processNightMode)
    this.processXcUpdate = this._processXcUpdate.bind(this)
    globalEventBus.on('EXCHANGE_UPDATE', this.processXcUpdate)
    if (darkEnabled()) chartStroke = darkStroke

    this.setNameDisplay()
    this.fetchInitialData()
  }

  disconnect () {
    responseCache = {}
    window.removeEventListener('resize', this.resize)
    document.removeEventListener(visibilityChange, this.tabVis)
    globalEventBus.off('NIGHT_MODE', this.processNightMode)
    globalEventBus.off('EXCHANGE_UPDATE', this.processXcUpdate)
  }

  _resize () {
    if (this.graph) {
      orderPtSize = screenIsBig() ? 7 : 4
      this.graph.resize()
    }
    this.setNameDisplay()
  }

  setNameDisplay () {
    if (screenIsBig()) {
      this.xcNameTarget.classList.remove('d-hide')
    } else {
      this.xcNameTarget.classList.add('d-hide')
    }
  }

  _tabVis () {
    focused = !document[hidden]
    if (focused && refreshAvailable) this.refreshChart()
  }

  async fetchInitialData () {
    Dygraph = await getDefault(
      import(/* webpackChunkName: "dygraphs" */ '../vendor/dygraphs.min.js')
    )
    var dummyGraph = new Dygraph(document.createElement('div'), [[0, 1]], { labels: ['', ''] })

    // A little hack to start with the default interaction model. Updating the
    // interactionModel with updateOptions later does not appear to work.
    var model = dummyGraph.getOption('interactionModel')
    model.wheel = gScroll
    model.mousedown = (event, g, context) => {
      // End panning even if the mouseup event is not on the chart.
      var mouseup = () => {
        context.isPanning = false
        document.removeEventListener('mouseup', mouseup)
      }
      document.addEventListener('mouseup', mouseup)
      context.initializeMouseDown(event, g, context)
      Dygraph.startPan(event, g, context)
    }
    model.mouseup = (event, g, context) => {
      if (!context.isPanning) return
      Dygraph.endPan(event, g, context)
      context.isPanning = false // I think Dygraph is supposed to set this, but they don't.
      var zoomCallback = g.getOption('zoomCallback')
      if (zoomCallback) {
        var range = g.xAxisRange()
        zoomCallback(range[0], range[1], g.yAxisRanges())
      }
    }
    model.mousemove = (event, g, context) => {
      if (!context.isPanning) return
      Dygraph.movePan(event, g, context)
    }
    commonChartOpts.interactionModel = model

    this.graph = new Dygraph(this.chartTarget, [[0, 0], [0, 1]], commonChartOpts)
    this.fetchChart()
  }

  async fetchChart (isRefresh) {
    var url = null
    requestCounter++
    var thisRequest = requestCounter
    var bin = settings.bin
    var xc = settings.xc
    var chart = settings.chart
    var oldZoom = this.graph.xAxisRange()
    if (usesCandlesticks(chart)) {
      if (!(xc in availableCandlesticks)) {
        console.warn('invalid candlestick exchange:', xc)
        return
      }
      if (availableCandlesticks[xc].indexOf(bin) === -1) {
        console.warn('invalid bin:', bin)
        return
      }
      url = `/api/chart/market/${xc}/candlestick/${bin}`
    } else if (usesOrderbook(chart)) {
      if (!validDepthExchange(xc)) {
        console.warn('invalid depth exchange:', xc)
        return
      }
      url = `/api/chart/market/${xc}/depth`
    }
    if (!url) {
      console.warn('invalid chart:', chart)
      return
    }

    this.chartLoaderTarget.classList.add('loading')

    var response
    if (hasCache(url)) {
      response = responseCache[url]
    } else {
      response = await axios.get(url)
      responseCache[url] = response
      if (thisRequest !== requestCounter) {
        // new request was issued while waiting.
        this.chartLoaderTarget.classList.remove('loading')
        return
      }
    }
    // Fiat conversion only available for order books for now.
    if (usesOrderbook(chart)) {
      this.conversionTarget.classList.remove('d-hide')
      this.ageSpanTarget.dataset.age = response.data.data.time
      this.ageSpanTarget.textContent = humanize.timeSince(response.data.data.time)
      this.ageTarget.classList.remove('d-hide')
    } else {
      this.conversionTarget.classList.add('d-hide')
      this.ageTarget.classList.add('d-hide')
    }
    this.graph.updateOptions(chartResetOpts, true)
    this.graph.updateOptions(this.processors[chart](response.data))
    this.query.replace(settings)
    if (isRefresh) this.graph.updateOptions({ dateWindow: oldZoom })
    else this.resetZoom()
    this.chartLoaderTarget.classList.remove('loading')
    this.lastUrl = url
    refreshAvailable = false
  }

  processCandlesticks (response) {
    var halfDuration = minuteMap[settings.bin] / 2
    var data = response.sticks.map(stick => {
      var t = new Date(stick.start)
      t.setMinutes(t.getMinutes() + halfDuration)
      return [t, stick.open, stick.close, stick.high, stick.low]
    })
    if (data.length === 0) return
    // limit to 50 points to start. Too many candlesticks = bad.
    var start = data[0][0]
    if (data.length > 50) {
      start = data[data.length - 50][0]
    }
    stickZoom = calcStickWindow(start, data[data.length - 1][0], settings.bin)
    return {
      file: data,
      labels: ['time', 'open', 'close', 'high', 'low'],
      xlabel: 'Time',
      ylabel: `Price (BTC)`,
      plotter: candlestickPlotter,
      axes: {
        x: {
          axisLabelFormatter: Dygraph.dateAxisLabelFormatter
        },
        y: {
          axisLabelFormatter: humanize.threeSigFigs,
          valueFormatter: humanize.threeSigFigs
        }
      }
    }
  }

  processHistory (response) {
    var halfDuration = minuteMap[settings.bin] / 2
    return {
      file: response.sticks.map(stick => {
        var t = new Date(stick.start)
        t.setMinutes(t.getMinutes() + halfDuration)
        // Not sure what the best way to reduce a candlestick to a single number
        // Trying this simple approach for now.
        var avg = (stick.open + stick.close + stick.high + stick.low) / 4
        return [t, avg]
      }),
      labels: ['time', 'price'],
      xlabel: 'Time',
      ylabel: `Price (BTC)`,
      colors: [chartStroke],
      plotter: Dygraph.Plotters.linePlotter,
      axes: {
        x: {
          axisLabelFormatter: Dygraph.dateAxisLabelFormatter
        },
        y: {
          axisLabelFormatter: humanize.threeSigFigs,
          valueFormatter: humanize.threeSigFigs
        }
      },
      strokeWidth: 3
    }
  }

  processVolume (response) {
    var halfDuration = minuteMap[settings.bin] / 2
    return {
      file: response.sticks.map(stick => {
        var t = new Date(stick.start)
        t.setMinutes(t.getMinutes() + halfDuration)
        return [t, stick.volume]
      }),
      labels: ['time', 'volume'],
      xlabel: 'Time',
      ylabel: `Volume (HDF / ${prettyDurations[settings.bin]})`,
      colors: [chartStroke],
      plotter: Dygraph.Plotters.linePlotter,
      axes: {
        x: {
          axisLabelFormatter: Dygraph.dateAxisLabelFormatter
        },
        y: {
          axisLabelFormatter: humanize.threeSigFigs,
          valueFormatter: humanize.threeSigFigs
        }
      },
      strokeWidth: 3
    }
  }

  processDepth (response) {
    if (response.tokens) {
      return this.processAggregateDepth(response)
    }
    var data = processOrderbook(response, translateDepthSide)
    return {
      labels: ['price', 'cumulative sell', 'cumulative buy'],
      file: data.pts,
      fillGraph: true,
      colors: ['#ed6d47', '#41be53'],
      xlabel: `Price (${this.converted ? fiatCode : 'BTC'})`,
      ylabel: 'Volume (HDF)',
      tokens: null,
      stats: data.stats,
      plotter: depthPlotter, // Don't use Dygraph.linePlotter here. fillGraph won't work.
      zoomCallback: this.zoomCallback,
      axes: {
        x: {
          axisLabelFormatter: convertedThreeSigFigs,
          valueFormatter: convertedEightDecimals
        },
        y: {
          axisLabelFormatter: humanize.threeSigFigs,
          valueFormatter: humanize.threeSigFigs
        }
      }
    }
  }

  processAggregateDepth (response) {
    var data = processOrderbook(response, translateAggregatedDepthSide)
    var tokens = response.tokens
    var xcCount = tokens.length
    var keys = sizedArray(xcCount * 2 + 1, null)
    keys[0] = 'price'
    var colors = sizedArray(xcCount * 2, null)
    for (let i = 0; i < xcCount; i++) {
      let token = tokens[i]
      let color = getHue(token)
      keys[i + 1] = ` ${token} sell`
      keys[xcCount + i + 1] = ` ${token} buy`
      colors[i] = color
      colors[xcCount + i] = color
    }
    return {
      labels: keys,
      file: data.pts,
      colors: colors,
      xlabel: `Price (${this.converted ? fiatCode : 'BTC'})`,
      ylabel: 'Volume (HDF)',
      plotter: depthPlotter,
      fillGraph: aggStacking,
      stackedGraph: aggStacking,
      tokens: tokens,
      stats: data.stats,
      zoomCallback: this.zoomCallback,
      axes: {
        x: {
          axisLabelFormatter: convertedThreeSigFigs,
          valueFormatter: convertedEightDecimals
        },
        y: {
          axisLabelFormatter: humanize.threeSigFigs,
          valueFormatter: humanize.threeSigFigs
        }
      }
    }
  }

  processOrders (response) {
    var data = processOrderbook(response, response.tokens ? translateAggregatedOrderbookSide : translateOrderbookSide)
    return {
      labels: ['price', 'sell', 'buy'],
      file: data.pts,
      colors: ['#f93f39cc', '#1acc84cc'],
      xlabel: `Price (${this.converted ? fiatCode : 'BTC'})`,
      ylabel: 'Volume (HDF)',
      plotter: orderPlotter,
      axes: {
        x: {
          axisLabelFormatter: convertedThreeSigFigs
        },
        y: {
          axisLabelFormatter: humanize.threeSigFigs,
          valueFormatter: humanize.threeSigFigs
        }
      },
      strokeWidth: 0,
      drawPoints: true,
      logscale: true,
      xRangePad: 15,
      yRangePad: 15
    }
  }

  justifyBins () {
    var bins = availableCandlesticks[settings.xc]
    if (bins.indexOf(settings.bin) === -1) {
      settings.bin = bins[0]
      this.setBinSelection()
    }
  }

  setButtons () {
    this.chartSelectTarget.value = settings.chart
    this.exchangesTarget.value = settings.xc
    if (usesOrderbook(settings.chart)) {
      this.binTarget.classList.add('d-hide')
      this.aggOptionTarget.disabled = false
      this.zoomTarget.classList.remove('d-hide')
    } else {
      this.binTarget.classList.remove('d-hide')
      this.aggOptionTarget.disabled = true
      this.zoomTarget.classList.add('d-hide')
      this.binButtons.forEach(button => {
        if (hasBin(settings.xc, button.name)) {
          button.classList.remove('d-hide')
        } else {
          button.classList.add('d-hide')
        }
      })
      this.setBinSelection()
    }
    var sticksDisabled = !availableCandlesticks[settings.xc]
    this.sticksOnlyTargets.forEach(option => {
      option.disabled = sticksDisabled
    })
    var depthDisabled = !validDepthExchange(settings.xc)
    this.depthOnlyTargets.forEach(option => {
      option.disabled = depthDisabled
    })
    if (settings.xc === aggregatedKey && settings.chart === depth) {
      this.aggStackTarget.classList.remove('d-hide')
      settings.stack = aggStacking ? 1 : 0
    } else {
      this.aggStackTarget.classList.add('d-hide')
      settings.stack = null
    }
  }

  setBinSelection () {
    var bin = settings.bin
    this.binButtons.forEach(button => {
      if (button.name === bin) {
        button.classList.add('btn-selected')
      } else {
        button.classList.remove('btn-selected')
      }
    })
  }

  changeGraph (e) {
    var target = e.target || e.srcElement
    settings.chart = target.value
    if (usesCandlesticks(settings.chart)) {
      this.justifyBins()
    }
    this.setButtons()
    this.fetchChart()
  }

  changeExchange () {
    settings.xc = this.exchangesTarget.value
    this.setExchangeName()
    if (usesCandlesticks(settings.chart)) {
      if (!availableCandlesticks[settings.xc]) {
        // exchange does not have candlestick data
        // show the depth chart.
        settings.chart = depth
      } else {
        this.justifyBins()
      }
    }
    this.setButtons()
    this.fetchChart()
    this.resetZoom()
  }

  setExchange (e) {
    var node = e.target || e.srcElement
    while (node && node.nodeName !== 'TR') node = node.parentNode
    if (!node || !node.dataset || !node.dataset.token) return
    this.exchangesTarget.value = node.dataset.token
    this.changeExchange()
  }

  changeBin (e) {
    var btn = e.target || e.srcElement
    if (btn.nodeName !== 'BUTTON' || !this.graph) return
    settings.bin = btn.name
    this.justifyBins()
    this.setBinSelection()
    this.fetchChart()
  }

  resetZoom () {
    if (settings.chart === candlestick) {
      this.graph.updateOptions({ dateWindow: stickZoom })
    } else if (usesOrderbook(settings.chart)) {
      if (orderZoom) this.graph.updateOptions({ dateWindow: orderZoom })
      else this.setZoomPct(defaultZoomPct)
    } else {
      this.graph.resetZoom()
    }
  }

  refreshChart () {
    refreshAvailable = true
    if (!focused) {
      return
    }
    this.fetchChart(true)
  }

  setConversion (e) {
    var btn = e.target || e.srcElement
    if (btn.nodeName !== 'BUTTON' || !this.graph) return
    this.conversionTarget.querySelectorAll('button').forEach(b => b.classList.remove('btn-selected'))
    btn.classList.add('btn-selected')
    var cLabel = 'BTC'
    if (e.target.name === 'BTC') {
      this.converted = false
      conversionFactor = 1
    } else {
      this.converted = true
      conversionFactor = btcPrice
      cLabel = fiatCode
    }
    this.graph.updateOptions({ xlabel: `Price (${cLabel})` })
  }

  setExchangeName () {
    this.xcLogoTarget.className = `exchange-logo ${settings.xc}`
    var prettyName = humanize.capitalize(settings.xc)
    this.xcNameTarget.textContent = prettyName
    var href = exchangeLinks[settings.xc]
    if (href) {
      this.linkTarget.href = href
      this.linkTarget.textContent = `Visit ${prettyName}`
      this.actionsTarget.classList.remove('d-hide')
    } else {
      this.actionsTarget.classList.add('d-hide')
    }
  }

  _processNightMode (data) {
    if (!this.graph) return
    chartStroke = data.nightMode ? darkStroke : lightStroke
    if (settings.chart === history || settings.chart === volume) {
      this.graph.updateOptions({ colors: [chartStroke] })
    }
    if (settings.chart === orders || settings.chart === depth) {
      this.graph.setAnnotations([])
    }
  }

  getExchangeRow (token) {
    var rows = this.xcRowTargets
    for (let i = 0; i < rows.length; i++) {
      let tr = rows[i]
      if (tr.dataset.token === token) {
        let row = {}
        tr.querySelectorAll('td').forEach(td => {
          switch (td.dataset.type) {
            case 'price':
              row.price = td
              break
            case 'volume':
              row.volume = td
              break
            case 'fiat':
              row.fiat = td
              break
            case 'arrow':
              row.arrow = td.querySelector('span')
              break
          }
        })
        return row
      }
    }
    return null
  }

  setStacking (e) {
    var btn = e.target || e.srcElement
    if (btn.nodeName !== 'BUTTON' || !this.graph) return
    this.aggStackTarget.querySelectorAll('button').forEach(b => b.classList.remove('btn-selected'))
    btn.classList.add('btn-selected')
    aggStacking = btn.name === 'on'
    this.graph.updateOptions({ stackedGraph: aggStacking, fillGraph: aggStacking })
  }

  setZoom (e) {
    var btn = e.target || e.srcElement
    if (btn.nodeName !== 'BUTTON' || !this.graph) return
    this.setZoomPct(parseInt(btn.name))
    var stats = this.graph.getOption('stats')
    var spread = stats.midGap * parseFloat(btn.name) / 100
    this.graph.updateOptions({ dateWindow: [stats.midGap - spread, stats.midGap + spread] })
  }

  setZoomPct (pct) {
    this.zoomButtons.forEach(b => {
      if (parseInt(b.name) === pct) b.classList.add('btn-selected')
      else b.classList.remove('btn-selected')
    })
    var stats = this.graph.getOption('stats')
    var spread = stats.midGap * pct / 100
    var low = stats.midGap - spread
    var high = stats.midGap + spread
    var min, max
    [min, max] = this.graph.xAxisExtremes()
    if (low < min) low = min
    if (high > max) high = max
    orderZoom = [low, high]
    this.graph.updateOptions({ dateWindow: orderZoom })
  }

  _zoomCallback (start, end) {
    orderZoom = [start, end]
    this.zoomButtons.forEach(b => b.classList.remove('btn-selected'))
  }

  _processXcUpdate (update) {
    let xc = update.updater
    if (update.fiat) { // btc-fiat exchange update
      this.xcIndexTargets.forEach(span => {
        if (span.dataset.token === xc.token) {
          span.textContent = xc.price.toFixed(2)
        }
      })
    } else { // hdf-btc exchange update
      let row = this.getExchangeRow(xc.token)
      row.volume.textContent = humanize.threeSigFigs(xc.volume)
      row.price.textContent = humanize.threeSigFigs(xc.price)
      row.fiat.textContent = (xc.price * update.btc_price).toFixed(2)
      if (xc.change >= 0) {
        row.arrow.className = 'hdficon-arrow-up text-green'
      } else {
        row.arrow.className = 'hdficon-arrow-down text-danger'
      }
    }
    // Update the big displayed value and the aggregated row
    var fmtPrice = update.price.toFixed(2)
    this.priceTarget.textContent = fmtPrice
    var aggRow = this.getExchangeRow(aggregatedKey)
    btcPrice = update.btc_price
    aggRow.price.textContent = humanize.threeSigFigs(update.price / btcPrice)
    aggRow.volume.textContent = humanize.threeSigFigs(update.volume)
    aggRow.fiat.textContent = fmtPrice
    // Auto-update the chart if it makes sense.
    if (settings.xc !== aggregatedKey && settings.xc !== xc.token) return
    if (settings.xc === aggregatedKey &&
        hasCache(this.lastUrl) &&
        responseCache[this.lastUrl].data.tokens.indexOf(update.updater) === -1) return
    if (usesOrderbook(settings.chart)) {
      clearCache(this.lastUrl)
      this.refreshChart()
    } else if (usesCandlesticks(settings.chart)) {
      // Only show refresh button if cache is expired
      if (!hasCache(this.lastUrl)) {
        this.refreshChart()
      }
    }
  }
}
