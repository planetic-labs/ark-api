import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { COLORS, FONTS } from '../../constants/Config';

interface Playlist {
  id: string;
  letter: string;
  name: string;
  progress: number; // percentage (0 to 100)
  total: number;
  studied: number;
  color: string;
  extra?: string;
}

export default function VideoScreen() {
  const playlists: Playlist[] = [
    { id: '1', letter: 'Н', name: 'Начало', progress: 100, total: 12, studied: 12, color: '#DCD5C7' },
    { id: '2', letter: 'Д', name: 'Дисциплина', progress: 55, total: 11, studied: 6, color: '#B9770C' },
    { id: '3', letter: 'В', name: 'Внимать', progress: 30, total: 13, studied: 4, color: '#E0951A' },
    { id: '4', letter: 'П', name: 'Практики', progress: 0, total: 9, studied: 0, color: '#A69D8F', extra: 'точечный возврат' },
    { id: '5', letter: 'К', name: 'Ключи', progress: 18, total: 11, studied: 2, color: '#6E655A' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Continue Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Продолжить</Text>
          
          <TouchableOpacity style={styles.continueCard}>
            <View style={styles.thumbWrapper}>
              <View style={styles.thumbBackground}>
                <View style={styles.playIconContainer}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path d="M8 5v14l11-7z" fill="#fff" />
                  </Svg>
                </View>
              </View>
              <View style={styles.thumbHeader}>
                <Text style={styles.thumbEyebrow}>Остановились здесь</Text>
              </View>
              {/* Progress bar at the bottom of thumbnail */}
              <View style={styles.thumbProgressContainer}>
                <View style={[styles.thumbProgressBar, { width: '60%' }]} />
              </View>
            </View>
            
            <View style={styles.ccInfo}>
              <Text style={styles.ccTitle}>Сатсанг 13.08 · часть 2</Text>
              <Text style={styles.ccMeta}>осталось 24:30 · плейлист «Внимать»</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Playlists Section */}
        <View style={[styles.section, { marginTop: 25 }]}>
          <Text style={styles.sectionTitle}>Плейлисты</Text>
          
          {playlists.map((item) => (
            <TouchableOpacity key={item.id} style={styles.playlistRow}>
              <View style={[styles.plCover, { backgroundColor: item.color }]}>
                <Text style={styles.plCoverText}>{item.letter}</Text>
              </View>
              
              <View style={styles.plInfo}>
                <Text style={styles.plName}>{item.name}</Text>
                
                {/* Progress Bar */}
                <View style={styles.plProgressBarBg}>
                  <View style={[styles.plProgressBar, { width: `${item.progress}%` }]} />
                </View>
                
                <Text style={styles.plCount}>
                  {item.studied} / {item.total} изучено {item.extra && `· ${item.extra}`}
                </Text>
              </View>

              <View style={styles.plChevron}>
                <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                  <Path d="M6 3.5l5 4.5-5 4.5" stroke={COLORS.textSecondary} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  section: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: FONTS.monoMedium,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  continueCard: {
    backgroundColor: '#fff',
    borderColor: '#ECE7DD',
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  thumbWrapper: {
    height: 160,
    width: '100%',
    position: 'relative',
  },
  thumbBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FAF8F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(34, 30, 23, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },
  thumbHeader: {
    position: 'absolute',
    top: 14,
    left: 16,
  },
  thumbEyebrow: {
    fontSize: 9,
    fontFamily: FONTS.monoMedium,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  thumbProgressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(34, 30, 23, 0.1)',
  },
  thumbProgressBar: {
    height: '100%',
    backgroundColor: COLORS.amber,
  },
  ccInfo: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F4F1EA',
  },
  ccTitle: {
    fontSize: 15,
    fontFamily: FONTS.displaySemiBold,
    color: COLORS.textPrimary,
  },
  ccMeta: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F1EA',
  },
  plCover: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plCoverText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FONTS.displaySemiBold,
  },
  plInfo: {
    flex: 1,
    marginLeft: 14,
  },
  plName: {
    fontSize: 14.5,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textPrimary,
  },
  plProgressBarBg: {
    height: 3,
    backgroundColor: '#F4F1EA',
    borderRadius: 1.5,
    marginTop: 6,
    width: '80%',
  },
  plProgressBar: {
    height: '100%',
    backgroundColor: COLORS.amber,
    borderRadius: 1.5,
  },
  plCount: {
    fontSize: 10.5,
    fontFamily: FONTS.mono,
    color: COLORS.textMuted,
    marginTop: 5,
  },
  plChevron: {
    paddingHorizontal: 5,
  },
});
