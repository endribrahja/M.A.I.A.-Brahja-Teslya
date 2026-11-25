"""Robust weekday/seasonal projection and chronological holdout evaluation."""
from datetime import timedelta
from statistics import median


def profile(samples, as_of):
    recent = [(day, volume) for day, volume in samples if day >= as_of-timedelta(days=56)]
    monthly = [volume for day, volume in recent if day >= as_of-timedelta(days=30)]
    if len(monthly) < 7:
        return None
    center = median(monthly)
    spread = 1.4826 * median(abs(value-center) for value in monthly)
    current = [value for day, value in recent if day >= as_of-timedelta(days=14)]
    previous = [value for day, value in recent if as_of-timedelta(days=28) <= day < as_of-timedelta(days=14)]
    trend = min(center*.2, max(-center*.2, median(current)-median(previous))) if len(current)>=7 and len(previous)>=7 else 0
    return recent, center, spread, trend


def point(samples, fitted, as_of, day, kind):
    recent, center, spread, trend = fitted
    weekdays = [value for stamp, value in recent if stamp.weekday() == day.weekday()]
    estimate = median(weekdays) if len(weekdays) >= 3 else center
    if kind == 'gas':
        same_season = day-timedelta(days=364)
        prior_year = [value for stamp, value in samples if abs((stamp-same_season).days)<=14]
        if len(prior_year)>=7:
            estimate = .8*estimate + .2*median(prior_year)
    horizon = max(0, (day-as_of).days)
    value = max(0, estimate+trend*min(1,horizon/14))
    width = 2*spread*(1+horizon/60)
    return {'date':str(day),'value':round(value,3),'low':round(max(0,value-width),3),'high':round(value+width,3)}


def forecast(samples, today, kind):
    fitted = profile(samples,today)
    predictions = [point(samples,fitted,today,today+timedelta(days=index),kind) for index in range(1,31)] if fitted else []
    cutoff = today-timedelta(days=14)
    training = [(day,value) for day,value in samples if day<cutoff]
    evaluation = [(day,value) for day,value in samples if cutoff<=day<today]
    holdout = profile(training,cutoff)
    scores = {}
    if holdout and evaluation:
        test = [(value,point(training,holdout,cutoff,day,kind)) for day,value in evaluation]
        scores = {
            'samples':len(test),
            'mae_m3':round(sum(abs(actual-row['value']) for actual,row in test)/len(test),3),
            'inside_band':sum(row['low']<=actual<=row['high'] for actual,row in test),
            'train_end':str(training[-1][0]),
            'test_start':str(evaluation[0][0]),
            'test_end':str(evaluation[-1][0]),
        }
    return predictions, scores
