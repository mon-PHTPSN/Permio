"""Failure injection for the owned cloud controller; no host/cloud commands."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('cloud_business_key', Path(__file__).parents[1] / 'cloud-business-key.py')
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class CleanupTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='permio-cloud-cleanup-')
        self.addCleanup(self.temporary.cleanup)
        self.vm = Path(self.temporary.name) / 'swappiness'
        self.vm.write_text('60\n')
        self.report = {}
        self.calls = []

    def command(self, args):
        self.calls.append(args)
        if 'LoadState' in args:
            return 'loaded'
        if 'MainPID' in args:
            return '0'
        if args[:2] == ['systemctl', 'stop']:
            return ''
        raise AssertionError('Unexpected command')

    def cleanup(self):
        build.restore_owned_state('owned.service', ('identity',), set(), self.vm, '10', self.report)

    def test_stops_accepted_unit_even_without_a_successful_launch_return(self):
        with patch.object(build, 'cmd', side_effect=self.command), \
             patch.object(build, 'swap_identity', return_value=('identity',)), \
             patch.object(build, 'swaps', return_value=set()):
            self.cleanup()
        self.assertIn(['systemctl', 'stop', 'owned.service'], self.calls)
        self.assertTrue(self.report['ownedJobStopped'])
        self.assertTrue(self.report['originalSwapStateRestored'])
        self.assertTrue(self.report['originalSwappinessRestored'])

    def test_unsafe_swapoff_does_not_skip_independent_vm_restoration(self):
        with patch.object(build, 'cmd', side_effect=self.command), \
             patch.object(build, 'swap_identity', return_value=('identity',)), \
             patch.object(build, 'swaps', return_value={str(build.SWAP)}), \
             patch.object(build, 'memory', return_value={'MemAvailable': 1, 'SwapTotal': 1000, 'SwapFree': 0}):
            with self.assertRaisesRegex(RuntimeError, 'cleanup incomplete'):
                self.cleanup()
        self.assertEqual(self.vm.read_text().strip(), '10')
        self.assertFalse(self.report['originalSwapStateRestored'])
        self.assertTrue(self.report['originalSwappinessRestored'])
        self.assertEqual(self.report['cleanupErrors'][0]['stage'], 'swap-state-restore')

    def test_concurrent_vm_change_is_preserved_and_reported(self):
        self.vm.write_text('25\n')
        with patch.object(build, 'cmd', side_effect=self.command), \
             patch.object(build, 'swap_identity', return_value=('identity',)), \
             patch.object(build, 'swaps', return_value=set()):
            with self.assertRaises(RuntimeError):
                self.cleanup()
        self.assertEqual(self.vm.read_text().strip(), '25')
        self.assertFalse(self.report['originalSwappinessRestored'])

    def test_failed_stop_is_not_reported_as_quiescence(self):
        with patch.object(build, 'cmd', side_effect=OSError('injected stop failure')):
            with self.assertRaises(RuntimeError):
                self.cleanup()
        self.assertFalse(self.report['ownedJobStopped'])
        self.assertFalse(self.report['originalSwapStateRestored'])
        self.assertFalse(self.report['originalSwappinessRestored'])
        self.assertEqual(self.vm.read_text().strip(), '60')

    def test_resource_boundaries_fail_closed(self):
        self.assertIsNone(build.stop_reason(512 * 1024 + 1, build.GIB + 1, 3599))
        self.assertEqual(build.stop_reason(512 * 1024, build.GIB + 1, 3599), 'host-memory-reserve')
        self.assertEqual(build.stop_reason(512 * 1024 + 1, build.GIB, 3599), 'disk-reserve')
        self.assertEqual(build.stop_reason(512 * 1024 + 1, build.GIB + 1, 3600), 'bounded-duration')


if __name__ == '__main__':
    unittest.main()
