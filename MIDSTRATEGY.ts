input Begin = 1030;
input End = 1600;
input agg = AggregationPeriod.DAY;
input tradeamount = 3;

def na = Double.NaN;
def Trade = if SecondsFromTime(Begin) >= 0 and SecondsTillTime(End) >= 0 then 1 else 0;


def vix_filter_Buy = if Round(100 * ((close("VIX", period = agg) / open("VIX", period = agg)) - 1), 1) < -4 
                 then 1 
                 else 0; 


def vix_filter_Sell = if Round(100 * ((close("VIX", period = agg) / open("VIX", period = agg)) - 1), 1) > 2
                 then 1 
                 else 0;


def CapturePeriodHasBegun = secondsFromTime(begin) > 0; 
def First = !CapturePeriodHasBegun[1] and CapturePeriodHasBegun;

rec h = If(high > h[1] and SecondsFromTime(Begin) >= 0, high,
        If(SecondsFromTime(Begin) >= 0 and !first, h[1], high));

rec l = If(low < l[1] and SecondsFromTime(Begin) >= 0, low,
        If(SecondsFromTime(Begin) >= 0 and !first, l[1], low));

plot Midpoint = if Trade then (h + l) / 2 else na;

def BUY = if !IsNaN(Midpoint) and vix_filter_Buy and low crosses above Midpoint then 1 else na;
def SELL = if !IsNaN(Midpoint) and vix_filter_Sell and high crosses below Midpoint then 1 else na;

def Exit = if SecondsTillTime(End) < 0 then 1 else na;


#Exit the trade for a loss if a 5-minute bar crosses below the mid-point of the day.

AddOrder(OrderType.BUY_TO_OPEN, BUY[-1], tradesize=tradeamount, name="long", price=low[-1]);
AddOrder(OrderType.SELL_TO_OPEN, SELL[-1], tradesize=tradeamount, name="short", price=high[-1]);

input enable_profit_target = {default N, Y};
def   p_target;
switch (enable_profit_target) {
case Y:
    p_target = 1;
case N:
    p_target = 0;
}

def profit_target = if (GetSymbol() == "/ES") then 10 else 1;
def long_target_price = EntryPrice() + profit_target;
def short_target_price = EntryPrice() - profit_target;

AddOrder(OrderType.SELL_TO_CLOSE, p_target == 1 and
         high[-1] >= long_target_price, price = long_target_price, name = "Profit Target");

AddOrder(OrderType.BUY_TO_CLOSE, p_target == 1 and 
         low[-1] <= short_target_price, price = short_target_price, name = "Profit Target");


AddOrder(OrderType.SELL_TO_CLOSE, Exit[-1], price=close, name="Flat");
AddOrder(OrderType.BUY_TO_CLOSE, Exit[-1], price=close, name="Flat");
