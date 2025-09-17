'use client'

import React, { useState } from 'react'
import { useSocialRecovery } from '@/contexts/SocialRecoveryContext'
import { GuardianManagement } from './GuardianManagement'
import { RecoveryProcess } from './RecoveryProcess'
import { SocialRecoveryConfig } from '@/types/socialRecovery'
import {
  ShieldCheckIcon,
  UserGroupIcon,
  ShieldExclamationIcon,
  CogIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

type TabType = 'guardians' | 'recovery' | 'settings'

export function SocialRecoverySettings() {
  const { state, updateRecoveryConfig, enableSocialRecovery, disableSocialRecovery } = useSocialRecovery()
  const [activeTab, setActiveTab] = useState<TabType>('guardians')
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false)
  const [configForm, setConfigForm] = useState<SocialRecoveryConfig>(state.config)

  const handleConfigUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdatingConfig(true)

    try {
      // Validate configuration
      if (configForm.guardianThreshold > state.guardians.length) {
        throw new Error('Guardian threshold cannot be greater than the number of guardians')
      }

      if (configForm.guardianThreshold < 1) {
        throw new Error('Guardian threshold must be at least 1')
      }

      if (configForm.recoveryDelay < 1) {
        throw new Error('Recovery delay must be at least 1 hour')
      }

      await updateRecoveryConfig(configForm)
      alert('Configuration updated successfully!')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update configuration'
      alert(errorMessage)
    } finally {
      setIsUpdatingConfig(false)
    }
  }

  const handleToggleRecovery = async () => {
    try {
      if (state.config.isEnabled) {
        if (window.confirm('Are you sure you want to disable social recovery? This will remove protection for your wallet.')) {
          await disableSocialRecovery()
        }
      } else {
        if (state.guardians.length < 2) {
          alert('You need at least 2 guardians to enable social recovery')
          setActiveTab('guardians')
          return
        }
        await enableSocialRecovery()
      }
    } catch (error) {
      console.error('Failed to toggle social recovery:', error)
      alert('Failed to update social recovery status')
    }
  }

  const tabs = [
    {
      id: 'guardians' as TabType,
      name: 'Guardians',
      icon: UserGroupIcon,
      count: state.guardians.length
    },
    {
      id: 'recovery' as TabType,
      name: 'Recovery',
      icon: ShieldExclamationIcon,
      badge: state.activeRecoveryRequest ? 'Active' : undefined
    },
    {
      id: 'settings' as TabType,
      name: 'Settings',
      icon: CogIcon
    }
  ]

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Social Recovery</h1>
            <p className="mt-1 text-sm text-gray-500">
              Protect your wallet with trusted guardians who can help you recover access
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${state.config.isEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium text-gray-700">
                {state.config.isEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <button
              onClick={handleToggleRecovery}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                state.config.isEnabled
                  ? 'text-red-700 bg-red-100 hover:bg-red-200 focus:ring-red-500'
                  : 'text-white bg-green-600 hover:bg-green-700 focus:ring-green-500'
              }`}
            >
              <ShieldCheckIcon className="h-4 w-4 mr-2" />
              {state.config.isEnabled ? 'Disable Recovery' : 'Enable Recovery'}
            </button>
          </div>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Guardians</dt>
                  <dd className="text-lg font-medium text-gray-900">{state.guardians.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShieldCheckIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Threshold</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {state.config.guardianThreshold} of {state.config.totalGuardians}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Recovery Delay</dt>
                  <dd className="text-lg font-medium text-gray-900">{state.config.recoveryDelay}h</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.name}
                {tab.count !== undefined && (
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs font-medium">
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span className="ml-2 bg-red-100 text-red-800 py-0.5 px-2.5 rounded-full text-xs font-medium">
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'guardians' && <GuardianManagement />}
        
        {activeTab === 'recovery' && <RecoveryProcess />}
        
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Configuration Form */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recovery Configuration</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Configure how social recovery works for your wallet
                </p>
              </div>
              <form onSubmit={handleConfigUpdate} className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="guardian-threshold" className="block text-sm font-medium text-gray-700">
                      Guardian Threshold
                    </label>
                    <select
                      id="guardian-threshold"
                      value={configForm.guardianThreshold}
                      onChange={(e) => setConfigForm({ ...configForm, guardianThreshold: parseInt(e.target.value) })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      {Array.from({ length: state.guardians.length }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>
                          {num} of {state.guardians.length} guardians
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Number of guardian approvals required for recovery
                    </p>
                  </div>

                  <div>
                    <label htmlFor="recovery-delay" className="block text-sm font-medium text-gray-700">
                      Recovery Delay (hours)
                    </label>
                    <input
                      type="number"
                      id="recovery-delay"
                      min="1"
                      max="168"
                      value={configForm.recoveryDelay}
                      onChange={(e) => setConfigForm({ ...configForm, recoveryDelay: parseInt(e.target.value) })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Delay before recovery can be executed (1-168 hours)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="max-attempts" className="block text-sm font-medium text-gray-700">
                      Max Recovery Attempts
                    </label>
                    <input
                      type="number"
                      id="max-attempts"
                      min="1"
                      max="10"
                      value={configForm.maxRecoveryAttempts}
                      onChange={(e) => setConfigForm({ ...configForm, maxRecoveryAttempts: parseInt(e.target.value) })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Maximum recovery attempts before cooldown
                    </p>
                  </div>

                  <div>
                    <label htmlFor="cooldown-period" className="block text-sm font-medium text-gray-700">
                      Cooldown Period (hours)
                    </label>
                    <input
                      type="number"
                      id="cooldown-period"
                      min="1"
                      max="720"
                      value={configForm.cooldownPeriod}
                      onChange={(e) => setConfigForm({ ...configForm, cooldownPeriod: parseInt(e.target.value) })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Cooldown period between recovery attempts
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      id="require-owner-approval"
                      type="checkbox"
                      checked={configForm.requireOwnerApproval}
                      onChange={(e) => setConfigForm({ ...configForm, requireOwnerApproval: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="require-owner-approval" className="ml-2 block text-sm text-gray-900">
                      Allow owner to veto recovery requests
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      id="allow-emergency-recovery"
                      type="checkbox"
                      checked={configForm.allowEmergencyRecovery}
                      onChange={(e) => setConfigForm({ ...configForm, allowEmergencyRecovery: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="allow-emergency-recovery" className="ml-2 block text-sm text-gray-900">
                      Allow emergency recovery (bypass delay)
                    </label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isUpdatingConfig}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isUpdatingConfig ? 'Updating...' : 'Update Configuration'}
                  </button>
                </div>
              </form>
            </div>

            {/* Security Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-6">
              <div className="flex">
                <ExclamationTriangleIcon className="h-6 w-6 text-blue-400" />
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-blue-800">
                    Security Best Practices
                  </h3>
                  <div className="mt-2 text-sm text-blue-700 space-y-1">
                    <p>• Choose guardians you trust completely and who understand the responsibility</p>
                    <p>• Use a mix of family, friends, and professionals as guardians</p>
                    <p>• Set a reasonable threshold (typically 50-70% of total guardians)</p>
                    <p>• Keep guardian contact information up to date</p>
                    <p>• Regularly review and update your recovery configuration</p>
                    <p>• Consider the recovery delay carefully - longer is more secure but less convenient</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
