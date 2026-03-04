#!/usr/bin/env python3
"""
Import meters from Excel into IndParkDocs
Usage: python3 scripts/import_meters.py [--url https://...] [--user valentina] [--password ...]
"""
import sys, os, argparse, json, requests, openpyxl
from datetime import datetime, date

def fmt_date(v):
    if v is None: return ''
    if isinstance(v, (datetime, date)):
        return v.strftime('%Y-%m-%d')
    s = str(v).strip()
    # try dd.mm.yyyy
    for fmt in ('%d.%m.%Y', '%Y-%m-%d', '%Y'):
        try:
            return datetime.strptime(s.rstrip('г. '), fmt).strftime('%Y-%m-%d')
        except: pass
    return s

def clean(v):
    if v is None: return ''
    return str(v).strip()

def login(base_url, username, password):
    r = requests.post(f'{base_url}/api/auth/login',
        json={'username': username, 'password': password}, verify=False, timeout=10)
    r.raise_for_status()
    return r.json()['accessToken']

def create_entity(base_url, token, name, meter_type, props):
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    payload = {'name': name, 'type_name': 'meter', 'properties': props}
    r = requests.post(f'{base_url}/api/entities', json=payload, headers=headers,
        verify=False, timeout=15)
    if r.status_code not in (200, 201):
        print(f'  ERROR {r.status_code}: {r.text[:200]}')
        return None
    return r.json().get('id')

def calc_next_verif(verif_date_str, interval_years):
    if not verif_date_str or not interval_years: return ''
    try:
        d = datetime.strptime(verif_date_str, '%Y-%m-%d')
        years = int(interval_years)
        months = round((float(interval_years) % 1) * 12)
        d = d.replace(year=d.year + years)
        if months:
            m = d.month + months
            d = d.replace(year=d.year + (m-1)//12, month=(m-1)%12+1)
        return d.strftime('%Y-%m-%d')
    except: return ''

def import_electricity(ws, base_url, token):
    count = 0
    for row in ws.iter_rows(min_row=2, max_row=200, values_only=True):
        if row[0] is None: continue  # no row number → skip
        loc          = clean(row[3])   # Место установки
        name_val     = clean(row[2])   # Наименование
        meter_num    = clean(row[4])   # Номер счётчика
        type_brand   = clean(row[6])   # Тип и марка
        manuf_date   = fmt_date(row[7])
        tn_tt        = clean(row[8])
        lim_cur      = clean(row[9])
        conn_to      = clean(row[11])
        mtbf         = clean(row[12])
        svc_life     = clean(row[13])
        warr_sale    = clean(row[14])
        warr_manuf   = clean(row[15])
        verif_int    = clean(row[16])
        verif_date   = fmt_date(row[17])
        next_verif   = fmt_date(row[18])

        if not next_verif and verif_date and verif_int:
            next_verif = calc_next_verif(verif_date, verif_int)

        entity_name = name_val or f'Эл.счётчик №{meter_num}' or f'Эл.счётчик {row[0]}'
        props = {
            'meter_type': 'Электричество',
            'installation_location': loc,
            'meter_number': str(meter_num).lstrip('№').strip(),
            'type_and_brand': type_brand,
            'manufacture_date': manuf_date,
            'tn_tt_ratio': str(tn_tt) if tn_tt else '',
            'limit_current': str(lim_cur) if lim_cur else '',
            'connected_to': conn_to,
            'mean_time_to_failure': mtbf,
            'service_life': str(svc_life) if svc_life else '',
            'warranty_from_sale': str(warr_sale) if warr_sale else '',
            'warranty_from_manufacture': str(warr_manuf) if warr_manuf else '',
            'verification_interval': str(verif_int) if verif_int else '',
            'verification_date': verif_date,
            'next_verification_date': next_verif,
        }
        eid = create_entity(base_url, token, entity_name, 'Электричество', props)
        print(f'  {"OK" if eid else "FAIL"} [{row[0]}] {entity_name} | {loc} | {meter_num}')
        if eid: count += 1
    return count

def import_sheet(ws, sheet_type, base_url, token, data_start_row=9):
    """Import Вода/Тепло/Газ sheets — hierarchical: location header rows, then meter rows."""
    count = 0
    current_location = ''
    for row in ws.iter_rows(min_row=data_start_row, values_only=True):
        # Skip completely empty rows
        if all(v is None for v in row): continue

        # Detect location header: has text in col[0] but no meter number in col[1]
        col0 = clean(row[0])
        col1 = clean(row[1]) if len(row) > 1 else ''
        col2 = clean(row[2]) if len(row) > 2 else ''

        # If col1 is empty and col0 has text → location group header
        if col0 and not col1 and not col2:
            current_location = col0
            continue

        # Meter row: has number in col[1]
        meter_num    = clean(row[1]) if len(row) > 1 else ''
        type_brand   = clean(row[2]) if len(row) > 2 else ''
        manuf_date   = fmt_date(row[3]) if len(row) > 3 else ''
        mtbf         = clean(row[4]) if len(row) > 4 else ''
        svc_life     = clean(row[5]) if len(row) > 5 else ''
        warr_sale    = clean(row[6]) if len(row) > 6 else ''
        warr_manuf   = clean(row[7]) if len(row) > 7 else ''
        verif_int    = clean(row[8]) if len(row) > 8 else ''
        verif_date   = fmt_date(row[9]) if len(row) > 9 else ''

        # Use col0 as additional location detail if it has text (e.g. "пожарка", "бойлерная")
        loc_detail = col0 if col0 else ''
        loc = (current_location + (' — ' + loc_detail if loc_detail else '')).strip()

        next_verif = calc_next_verif(verif_date, verif_int)

        # Name: location + type/brand or meter number
        entity_name = (loc_detail or current_location or '') + (' ' + type_brand if type_brand else '') + (' №' + meter_num if meter_num else '')
        entity_name = entity_name.strip() or f'{sheet_type} счётчик №{meter_num}'

        props = {
            'meter_type': sheet_type,
            'installation_location': loc,
            'meter_number': str(meter_num).lstrip('№').strip(),
            'type_and_brand': type_brand,
            'manufacture_date': manuf_date,
            'mean_time_to_failure': str(mtbf) if mtbf else '',
            'service_life': str(svc_life) if svc_life else '',
            'warranty_from_sale': str(warr_sale) if warr_sale else '',
            'warranty_from_manufacture': str(warr_manuf) if warr_manuf else '',
            'verification_interval': str(verif_int) if verif_int else '',
            'verification_date': verif_date,
            'next_verification_date': next_verif,
        }
        eid = create_entity(base_url, token, entity_name, sheet_type, props)
        print(f'  {"OK" if eid else "FAIL"} [{loc}] {type_brand} | №{meter_num}')
        if eid: count += 1
    return count

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--url',      default='https://89.167.75.91:3335')
    p.add_argument('--user',     default='valentina')
    p.add_argument('--password', default='Val2026secure')
    p.add_argument('--file',     default='/root/.openclaw/media/inbound/file_182---1f303d96-1bec-4b4e-931a-d9075b74f90f.xlsx')
    args = p.parse_args()

    import urllib3; urllib3.disable_warnings()

    print(f'Logging in to {args.url}...')
    token = login(args.url, args.user, args.password)
    print('  OK — got token')

    print('Loading Excel...')
    wb = openpyxl.load_workbook(args.file, data_only=True)
    total = 0

    print('\n=== Электроэнергия ===')
    total += import_electricity(wb['Электроэнергия'], args.url, token)

    for sheet_type, sheet_name in [('Вода','Вода'),('Тепло','Тепло'),('Газ','Газ')]:
        print(f'\n=== {sheet_name} ===')
        total += import_sheet(wb[sheet_name], sheet_type, args.url, token, data_start_row=9)

    print(f'\n✅ Импортировано счётчиков: {total}')

if __name__ == '__main__':
    main()
