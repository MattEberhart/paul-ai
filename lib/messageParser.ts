import type { PlayerAnalysis } from '../types';

/**
 * Formats the player analysis into a readable GroupMe message
 */
export function formatRosterResponse(analysis: PlayerAnalysis): string {
  const lines: string[] = [];
  
  lines.push('📋 This Week\'s Roster (since last Wednesday):');
  lines.push('');

  // Confirmed players
  if (analysis.confirmedPlayers.length > 0) {
    lines.push(`✅ Confirmed Players (${analysis.confirmedPlayers.length}):`);
    analysis.confirmedPlayers.forEach((player) => {
      lines.push(`- ${player}`);
    });
    lines.push('');
  } else {
    lines.push('✅ Confirmed Players: None');
    lines.push('');
  }

  // +1 Guests
  if (analysis.plusOnes.length > 0) {
    const totalPlusOnes = analysis.plusOnes.reduce(
      (sum, item) => sum + (item.guestCount || 1),
      0
    );
    lines.push(`👥 +1 Guests (${totalPlusOnes}):`);
    analysis.plusOnes.forEach((item) => {
      const guestText = item.guestCount > 1 
        ? `${item.inviter}'s +${item.guestCount}`
        : `${item.inviter}'s +1`;
      lines.push(`- ${guestText}`);
    });
    lines.push('');
  }

  // Withdrawn players
  if (analysis.withdrawnPlayers.length > 0) {
    lines.push('❌ Withdrawn:');
    analysis.withdrawnPlayers.forEach((player) => {
      lines.push(`- ${player} (was in, now out)`);
    });
    lines.push('');
  }

  // Status
  if (analysis.gameStatus === 'cancelled') {
    lines.push('⚠️ Status: Game CANCELLED');
    if (analysis.cancellationReason) {
      lines.push(`Reason: ${analysis.cancellationReason}`);
    }
  } else {
    const minPlayers = 10;
    const currentCount = analysis.totalCount;
    
    if (currentCount >= minPlayers) {
      lines.push(`✅ Status: Ready to play! (${currentCount} players)`);
    } else {
      const needed = minPlayers - currentCount;
      lines.push(
        `⚠️ Status: Need ${needed} more player${needed > 1 ? 's' : ''} (currently ${currentCount} with +1s)`
      );
    }
  }

  return lines.join('\n');
}
