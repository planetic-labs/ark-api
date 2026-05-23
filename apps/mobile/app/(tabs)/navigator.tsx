import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, FlatList, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { COLORS, FONTS } from '../../constants/Config';

interface SectionItem {
  id: string;
  num: string;
  name: string;
  status: 'done' | 'active' | 'future';
}

export default function NavigatorScreen() {
  const [modalVisible, setModalVisible] = useState(false);

  const sections: SectionItem[] = [
    { id: '1', num: '01', name: 'Договор', status: 'done' },
    { id: '2', num: '02', name: 'Чаты', status: 'done' },
    { id: '3', num: '03', name: 'Рабочие встречи в Zoom', status: 'done' },
    { id: '4', num: '04', name: 'Записи встреч', status: 'done' },
    { id: '5', num: '05', name: 'Написание отчётов', status: 'done' },
    { id: '6', num: '06', name: 'Корректировки', status: 'done' },
    { id: '7', num: '07', name: 'Плейлист «Начало»', status: 'done' },
    { id: '8', num: '08', name: 'Другие плейлисты', status: 'active' },
    { id: '9', num: '09', name: 'Групповые практики', status: 'active' },
    { id: '10', num: '10', name: 'Оплата Мастеру и личка Воинов', status: 'future' },
    { id: '11', num: '11', name: 'Дополнительные моменты', status: 'future' },
    { id: '12', num: '12', name: 'Указатели, ключи, корректировки', status: 'future' },
    { id: '13', num: '13', name: 'Архивные материалы — чаты', status: 'future' },
    { id: '14', num: '14', name: 'Архивные материалы — видео', status: 'future' },
  ];

  return (
    <View style={styles.container}>
      <Tabs.Screen
        options={{
          headerTitle: 'Навигатор',
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => setModalVisible(true)} 
              style={styles.pillButton}
            >
              <Svg width={14} height={14} viewBox="0 0 15 15" fill="none" style={{ marginRight: 5 }}>
                <Path d="M2 3.5h11M2 7.5h11M2 11.5h7" stroke={COLORS.amber} strokeWidth={1.7} strokeLinecap="round" />
              </Svg>
              <Text style={styles.pillButtonText}>Разделы</Text>
            </TouchableOpacity>
          )
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.headerInfo}>
          <Text style={styles.subtitle}>v6 · обновляется без перевыпуска</Text>
        </View>

        {/* Step 1 */}
        <View style={styles.node}>
          <View style={styles.rail}>
            <View style={[styles.dot, styles.dotDone]}>
              <Text style={styles.checkMark}>✓</Text>
            </View>
            <View style={[styles.line, styles.lineDone]} />
          </View>
          <View style={styles.nodeBody}>
            <Text style={styles.nodeStep}>Шаг 1</Text>
            <Text style={styles.nodeTitle}>Вход в Работу</Text>
          </View>
        </View>

        {/* Step 2 */}
        <View style={styles.node}>
          <View style={styles.rail}>
            <View style={[styles.line, styles.lineDone]} />
            <View style={[styles.dot, styles.dotDone]}>
              <Text style={styles.checkMark}>✓</Text>
            </View>
            <View style={[styles.line, styles.lineDone]} />
          </View>
          <View style={styles.nodeBody}>
            <Text style={styles.nodeStep}>Шаг 2</Text>
            <Text style={styles.nodeTitle}>Плейлист «Начало»</Text>
          </View>
        </View>

        {/* Step 3 (Active) */}
        <View style={styles.node}>
          <View style={styles.rail}>
            <View style={[styles.line, styles.lineDone]} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={[styles.line, styles.lineFaint]} />
          </View>
          <View style={styles.nodeBody}>
            <Text style={[styles.nodeStep, { color: COLORS.amber }]}>Шаг 3 · здесь сейчас</Text>
            <Text style={[styles.nodeTitle, styles.nodeTitleActive]}>Архив рабочей группы · чаты 1–12</Text>
            
            <View style={styles.activeCard}>
              <Text style={styles.cardText}>
                Ранний архив. Аудиозаписи, скриншоты для изучения и записи Сатсангов идут одной последовательностью — порядок задаёт этот узел.
              </Text>
              
              <Text style={styles.mergeNote}>3 сущности архива сведены в один шаг:</Text>
              
              <View style={styles.materialsList}>
                {/* Item 1 */}
                <View style={styles.materialLink}>
                  <View style={styles.materialIcon}>
                    <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
                      <Path d="M3 9V6c0-2.5 2-4.5 4.5-4.5S12 3.5 12 6v3" stroke={COLORS.textSecondary} strokeWidth={1.5} />
                      <Rect x={2} y={8.5} width={3} height={5} rx={1.4} stroke={COLORS.textSecondary} strokeWidth={1.5} />
                      <Rect x={10} y={8.5} width={3} height={5} rx={1.4} stroke={COLORS.textSecondary} strokeWidth={1.5} />
                    </Svg>
                  </View>
                  <View style={styles.materialBody}>
                    <Text style={styles.materialKind}>Аудио</Text>
                    <Text style={styles.materialTitle}>Чат 8 · аудио-плейлист</Text>
                  </View>
                  <Text style={styles.materialCheck}>✓</Text>
                </View>

                {/* Item 2 */}
                <View style={styles.materialLink}>
                  <View style={styles.materialIcon}>
                    <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
                      <Rect x={2} y={2.5} width={11} height={10} rx={1.6} stroke={COLORS.textSecondary} strokeWidth={1.5} />
                      <Path d="M2 10l3-3 2.5 2.5L10 6l3 3" stroke={COLORS.textSecondary} strokeWidth={1.5} strokeLinejoin="round" />
                    </Svg>
                  </View>
                  <View style={styles.materialBody}>
                    <Text style={styles.materialKind}>Скриншоты</Text>
                    <Text style={styles.materialTitle}>Чат 8 · тексты для изучения</Text>
                  </View>
                  <Text style={styles.materialCheck}>✓</Text>
                </View>

                {/* Item 3 */}
                <View style={styles.materialLink}>
                  <View style={styles.materialIcon}>
                    <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
                      <Rect x={2} y={3} width={11} height={9} rx={1.6} stroke={COLORS.textSecondary} strokeWidth={1.5} />
                      <Path d="M6.5 6l3 1.5-3 1.5V6z" fill={COLORS.amber} />
                    </Svg>
                  </View>
                  <View style={styles.materialBody}>
                    <Text style={styles.materialKind}>Запись Сатсанга</Text>
                    <Text style={styles.materialTitle}>19.07 · вставлен между аудио</Text>
                  </View>
                  <View style={styles.materialCircle} />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Step 4 */}
        <View style={[styles.node, styles.nodeFuture]}>
          <View style={styles.rail}>
            <View style={[styles.line, styles.lineFaint]} />
            <View style={styles.dot} />
            <View style={[styles.line, styles.lineFaint]} />
          </View>
          <View style={styles.nodeBody}>
            <Text style={styles.nodeStep}>Шаг 4</Text>
            <Text style={styles.nodeTitle}>Архивные материалы Работы</Text>
          </View>
        </View>

        {/* Step 5 */}
        <View style={[styles.node, styles.nodeFuture]}>
          <View style={styles.rail}>
            <View style={[styles.line, styles.lineFaint]} />
            <View style={styles.dot} />
          </View>
          <View style={styles.nodeBody}>
            <Text style={styles.nodeStep}>Шаг 5</Text>
            <Text style={styles.nodeTitle}>Постоянная практика внимания</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sections List Bottom Sheet Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.backdropPress} onPress={() => setModalVisible(false)} />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Разделы Навигатора</Text>
              <Text style={styles.sheetSub}>14 разделов</Text>
            </View>

            <FlatList
              data={sections}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.sheetBody}
              renderItem={({ item }) => {
                const isDone = item.status === 'done';
                const isActive = item.status === 'active';
                
                return (
                  <View style={[styles.secItem, isDone && styles.secItemDone]}>
                    <Text style={[styles.secNum, isDone && styles.secNumDone]}>{item.num}</Text>
                    <Text style={[styles.secName, isDone && styles.secNameDone, isActive && styles.secNameActive]}>
                      {item.name}
                    </Text>
                    <View style={styles.secState}>
                      {isDone && <Text style={styles.secCheck}>✓</Text>}
                      {isActive && <View style={styles.secDot} />}
                      {item.status === 'future' && <View style={styles.secCircle} />}
                    </View>
                  </View>
                );
              }}
            />
          </View>
        </View>
      </Modal>
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
    paddingBottom: 40,
  },
  headerInfo: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F1EA',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF1DC',
    borderColor: '#F0DFB8',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 15,
  },
  pillButtonText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.amber,
  },
  node: {
    flexDirection: 'row',
    marginBottom: 0,
    minHeight: 80,
  },
  nodeFuture: {
    opacity: 0.5,
  },
  rail: {
    width: 32,
    alignItems: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ECE7DD',
    borderWidth: 1.5,
    borderColor: '#A69D8F',
  },
  dotDone: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#B9770C',
    borderColor: '#B9770C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  dotActive: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E0951A',
    borderColor: '#FAF1DC',
    borderWidth: 3,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#ECE7DD',
  },
  lineDone: {
    backgroundColor: '#B9770C',
  },
  lineFaint: {
    backgroundColor: '#ECE7DD',
  },
  nodeBody: {
    flex: 1,
    paddingLeft: 16,
    paddingBottom: 25,
  },
  nodeStep: {
    fontSize: 11,
    fontFamily: FONTS.monoMedium,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nodeTitle: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontFamily: FONTS.displaySemiBold,
    marginTop: 2,
  },
  nodeTitleActive: {
    fontSize: 16,
  },
  activeCard: {
    backgroundColor: '#FCFAF5',
    borderColor: '#ECE7DD',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  cardText: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
  },
  mergeNote: {
    fontSize: 11,
    fontFamily: FONTS.monoMedium,
    color: COLORS.amber,
    marginTop: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  materialsList: {
    marginTop: 10,
  },
  materialLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#F4F1EA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  materialIcon: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FCFAF5',
    borderRadius: 6,
  },
  materialBody: {
    flex: 1,
    marginLeft: 10,
  },
  materialKind: {
    fontSize: 9,
    fontFamily: FONTS.monoMedium,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  materialTitle: {
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  materialCheck: {
    color: COLORS.amber,
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 4,
  },
  materialCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.amber,
    marginRight: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(34, 30, 23, 0.4)',
  },
  backdropPress: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E7E3DA',
    alignSelf: 'center',
    marginBottom: 15,
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F1EA',
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: FONTS.displaySemiBold,
    color: COLORS.textPrimary,
  },
  sheetSub: {
    fontSize: 11,
    fontFamily: FONTS.mono,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sheetBody: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F1EA',
  },
  secItemDone: {
    opacity: 0.6,
  },
  secNum: {
    width: 24,
    fontSize: 11,
    fontFamily: FONTS.monoMedium,
    color: COLORS.textMuted,
  },
  secNumDone: {
    color: COLORS.textMuted,
  },
  secName: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
  },
  secNameDone: {
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
  secNameActive: {
    fontFamily: FONTS.bodyMedium,
    color: COLORS.amber,
  },
  secState: {
    width: 24,
    alignItems: 'flex-end',
  },
  secCheck: {
    color: COLORS.amber,
    fontWeight: 'bold',
    fontSize: 12,
  },
  secDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.amber,
  },
  secCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#ECE7DD',
  },
});
