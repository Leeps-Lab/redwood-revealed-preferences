#!/usr/bin/python
# sort of stateful, since data rows don't specify which round they are from

import sys
import csv
import json


out_data = []
current_round = {} 

reader = csv.DictReader(sys.stdin)
for row in reader:
    subject = row['Sender']
    period = row['Period']
    key = row['Key']
    
    if key == 'rp.round_started':
        data = json.loads(row['Value'])
        current_round[subject] = {
            'price': data['price'],
            'endowment': data['endowment'],
            'round': data['round'],
        }

# rp.confirm
    elif key == 'rp.perform_allocation':
        round_config = current_round[subject]
        data = json.loads(row['Value'])
        out_data.append({
            'price': round_config['price'],
            'endowment': round_config['endowment'],
            'round': round_config['round'],
            'selection': [data['x'], data['y']]
        })
    
print json.dumps(out_data, indent=2)
