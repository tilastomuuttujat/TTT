"""Data-contract checks against an explicit, immutable source repository checkout.
Run VIVID_REPO=/path/to/vivid-data-visions python -m unittest discover -s tests -p test_vivid_import.py.
"""
import importlib.util
import os
from pathlib import Path
import unittest
from unittest.mock import patch

SPEC=importlib.util.spec_from_file_location('vivid_import',Path(__file__).resolve().parents[1]/'scripts/import-vivid-data.py')
m=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(m)

class SQLBoundary(unittest.TestCase):
    def test_embedded_dollar_tag_and_quotes_remain_data(self):
        p={'title':"O'Brien $vivid$; COMMIT; --"}
        sql=m.stage_sql(p,0)
        tag='$vivid_'+m.sha(p)+'$'
        self.assertEqual(sql.count(tag),2)
        self.assertIn("O''Brien $vivid$; COMMIT; --",sql)


@unittest.skipUnless(os.environ.get('VIVID_REPO'),'Set VIVID_REPO to the pinned source checkout')
class SourceContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root=Path(os.environ['VIVID_REPO']).resolve()
        cls.payloads,cls.manifest=m.build(cls.root)
        cls.series={p['series']['series_key']:p['series'] for p in cls.payloads if 'series' in p}
    def rows(self,key):
        return [r for p in self.payloads if p.get('series',{}).get('series_key')==key for r in p['values']]
    def test_totals_and_unique_keys(self):
        c=self.manifest['counts'];self.assertEqual((c['series'],c['numeric_observations'],c['missing_observations']),(69,69647,1638))
        rows=[(p['series']['series_key'],r['y'],r['g']) for p in self.payloads if 'series' in p for r in p['values']]
        self.assertEqual(len(rows),len(set(rows)))
    def test_election_has_its_own_year(self):
        rows=self.rows('vivid.municipal.voting_a2026')
        self.assertEqual({r['y'] for r in rows},{2025});self.assertEqual(sum(r['v'] is not None for r in rows),292)
    def test_missing_is_not_zero(self):
        rows=self.rows('vivid.housing_wealth.housing.expenditureShare')
        self.assertEqual([r['v'] for r in rows if r['y']==2003],[None,None])
    def test_surveys_do_not_fabricate_annual_values(self):
        years={r['y'] for r in self.rows('vivid.housing_wealth.wealth.median')}
        self.assertEqual(years,{1987,1988,1994,1998,2004,2009,2013,2016,2019,2023})
        self.assertEqual(self.series['vivid.housing_wealth.wealth.median']['frequency'],'survey_wave')
    def test_care_definitions_remain_separate(self):
        a=self.series['vivid.care.sotkanet_5679']['metadata'];b=self.series['vivid.care.sotkanet_6035']['metadata']
        self.assertEqual(a['fixed_threshold'],0.7);self.assertEqual(b['threshold_basis'],'each_year_current_legal_requirement')
        self.assertEqual(self.series['vivid.care.sotkanet_5513']['metadata']['known_break_years'],[2019])
    def test_correct_source_for_earlier_local_income(self):
        row=next(r for r in self.rows('vivid.municipal.income_a2025') if r['y']==2010 and r['g']=='KU075')
        self.assertEqual(row['m']['repository_file'],'src/components/planeetta/local-adaptation-data.json')
        request=self.series['vivid.municipal.income_a2025']['metadata']['additional_source_requests'][0]
        self.assertTrue(request['url'].endswith('/14ww.px'))
    def test_cashflows_are_not_budget_income_or_annual_counts(self):
        d=self.payloads[-1]['reports'][1]['data'];stock=next(t for t in d['transactions'] if t['year']==2021)
        self.assertFalse(stock['is_cash']);self.assertEqual(stock['amount_unit'],'million EUR')
        sampo=next(t for t in d['transactions'] if t['company']=='sampo');self.assertTrue(sampo['not_state_budget_receipt'])
        self.assertEqual(len([r for r in d['dividends'] if r['profitYear']==2019]),2)
    def test_no_causal_edges_are_invented(self):
        self.assertNotIn('relations',self.payloads[-1]);self.assertTrue(all(not r['data']['causal_effect_identified'] for r in self.payloads[-1]['reports']))
    def test_manifest_and_sql_are_deterministic(self):
        _,manifest=m.build(self.root);self.assertEqual(manifest,self.manifest)
        self.assertTrue(m.finalize_sql(manifest).endswith('ROLLBACK;\n'))
        self.assertTrue(m.finalize_sql(manifest,True).endswith('COMMIT;\n'))
    def test_modified_source_is_rejected(self):
        original=Path.read_bytes;target=self.root/m.FILES[0]
        def altered(path):return original(path)+b' ' if path==target else original(path)
        with patch.object(Path,'read_bytes',altered):
            with self.assertRaisesRegex(ValueError,'Uncommitted source change'):m.build(self.root)

if __name__=='__main__':unittest.main()
