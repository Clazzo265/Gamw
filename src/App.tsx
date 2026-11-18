/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { CampaignModal } from './components/CampaignModal';
import { LobbyViews } from './components/LobbyViews';
import { ACHIEVEMENTS, getLevelById, getLevelsForGame } from './data/campaigns';
import { soundEngine } from './engine/audio';
import { ChipereganyuBoxGame } from './games/ChipereganyuBoxGame';
import { MalawiAdventureGame } from './games/MalawiAdventureGame';
import { MinibusRaceGame } from './games/MinibusRaceGame';
import { NsimaRushGame } from './games/NsimaRushGame';
import { ZuriVsAmaraGame } from './games/ZuriVsAmaraGame';
import {
  applyLevelOutcome,
  claimChallengeReward,
  loadSaveData,
  persistSaveData,
  purchaseCustomization,
  updateSettings,
} from './state/store';
import {
  CharacterId,
  GameId,
  LevelOutcome,
  LobbyTab,
  PlayerSaveData,
  PlayerSettings,
} from './types/game';

export default function App() {
  const [saveData, setSaveData] = useState<PlayerSaveData>(() => loadSaveData());
  const [activeTab, setActiveTab] = useState<LobbyTab>('home');
  const [campaignGameId, setCampaignGameId] = useState<GameId | null>(null);
  const [activeLevelId, setActiveLevelId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const gameParam = params.get('game') as GameId | null;
    if (params.get('autostart') === '1' && gameParam) {
      const levels = getLevelsForGame(gameParam);
      if (levels.length > 0) return levels[0].id;
    }
    return null;
  });
  const [autostartFlag] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') === '1';
  });
  const [achievementBanner, setAchievementBanner] = useState<string | null>(null);

  useEffect(() => {
    persistSaveData(saveData);
    soundEngine.syncSettings(saveData.settings);
  }, [saveData]);

  useEffect(() => {
    if (!activeLevelId) {
      document.body.dataset.state = 'title';
    }
  }, [activeLevelId]);

  useEffect(() => {
    const unlockAudio = () => {
      if (saveData.settings.musicEnabled) {
        soundEngine.startAmbientMusic();
      }
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    return () => window.removeEventListener('pointerdown', unlockAudio);
  }, [saveData.settings.musicEnabled]);

  const handleLaunchLevel = useCallback((levelId: string) => {
    setCampaignGameId(null);
    setActiveLevelId(levelId);
  }, []);

  const handleLevelComplete = useCallback((outcome: LevelOutcome) => {
    setSaveData((prev) => {
      const res = applyLevelOutcome(prev, outcome);
      if (res.newlyUnlockedAchievements.length > 0) {
        const first = ACHIEVEMENTS.find((a) => a.id === res.newlyUnlockedAchievements[0]);
        if (first) {
          setAchievementBanner(first.title);
          window.setTimeout(() => setAchievementBanner(null), 5000);
        }
      }
      return res.nextSave;
    });
  }, []);

  const handleToggleAudio = useCallback(() => {
    setSaveData((prev) =>
      updateSettings(prev, {
        musicEnabled: !prev.settings.musicEnabled,
        sfxEnabled: !prev.settings.musicEnabled,
      }),
    );
  }, []);

  const activeLevel = activeLevelId ? getLevelById(activeLevelId) : undefined;

  if (activeLevel) {
    const gameLevels = getLevelsForGame(activeLevel.gameId);
    const nextLevel = gameLevels.find((l) => l.globalIndex === activeLevel.globalIndex + 1);

    const commonProps = {
      level: activeLevel,
      graphicsQuality: saveData.settings.graphicsQuality,
      musicEnabled: saveData.settings.musicEnabled,
      autostart: autostartFlag,
      hasNextLevel: Boolean(nextLevel),
      onToggleAudio: handleToggleAudio,
      onComplete: handleLevelComplete,
      onExitToLobby: () => setActiveLevelId(null),
      onNextLevel: () => {
        if (nextLevel) setActiveLevelId(nextLevel.id);
      },
    };

    switch (activeLevel.gameId) {
      case 'nsima-rush':
        return <NsimaRushGame {...commonProps} chitenjeId={saveData.selectedChitenjeId} />;
      case 'minibus-race':
        return <MinibusRaceGame {...commonProps} minibusId={saveData.selectedMinibusId} />;
      case 'chipereganyu-box':
        return <ChipereganyuBoxGame {...commonProps} />;
      case 'zuri-vs-amara':
        return <ZuriVsAmaraGame {...commonProps} playerCharacter={saveData.selectedAvatar} />;
      case 'malawi-adventure':
        return <MalawiAdventureGame {...commonProps} />;
    }
  }

  return (
    <>
      <LobbyViews
        saveData={saveData}
        activeTab={activeTab}
        achievementBanner={achievementBanner}
        onChangeTab={setActiveTab}
        onLaunchLevel={handleLaunchLevel}
        onOpenCampaign={(gid) => setCampaignGameId(gid)}
        onSelectAvatar={(cid: CharacterId) =>
          setSaveData((prev) => ({ ...prev, selectedAvatar: cid }))
        }
        onPurchaseItem={(itemId) =>
          setSaveData((prev) => purchaseCustomization(prev, itemId))
        }
        onClaimChallenge={(chId) =>
          setSaveData((prev) => claimChallengeReward(prev, chId))
        }
        onUpdateSettings={(partial: Partial<PlayerSettings>) =>
          setSaveData((prev) => updateSettings(prev, partial))
        }
        onUpdatePlayerName={(name) =>
          setSaveData((prev) => ({ ...prev, playerName: name }))
        }
      />

      {campaignGameId && (
        <CampaignModal
          gameId={campaignGameId}
          saveData={saveData}
          onSelectLevel={handleLaunchLevel}
          onClose={() => setCampaignGameId(null)}
        />
      )}
    </>
  );
}
