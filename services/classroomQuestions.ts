/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BeliefState, ClassroomQuestion } from '../types';
import { Language } from '../translations';

export const getDefaultClassroomQuestions = (
  prompt: string = '',
  beliefGraph?: BeliefState | null,
  selectedModel: string = 'gemini-3.1-flash-lite-image',
  language: string = 'vi'
): ClassroomQuestion[] => {
  const mainEntity = beliefGraph?.entities?.[0]?.name || (language === 'vi' ? 'Nhân vật & Chủ thể chính' : 'Main Subject');
  const entityAttr = beliefGraph?.entities?.[0]?.attributes?.[0]?.name 
    ? `${beliefGraph.entities[0].attributes[0].name}: ${beliefGraph.entities[0].attributes[0].value?.[0]?.name || ''}`
    : (language === 'vi' ? 'Màu sắc tươi sáng, nét vẽ đáng yêu' : 'Bright colors and cute style');

  const cleanPrompt = prompt ? prompt.trim() : (language === 'vi' ? 'bức tranh sinh động' : 'vibrant artwork');
  const promptSummary = cleanPrompt.length > 35 ? cleanPrompt.slice(0, 35) + '...' : cleanPrompt;

  return [
    {
      id: 'q1',
      question: language === 'vi'
        ? `Câu 1: Bé hãy quan sát bức tranh vừa tạo trên màn hình chiếu: Chi tiết nào thể hiện nổi bật nhất chủ thể "${mainEntity}"?`
        : `Question 1: Look at the projected artwork: Which visual detail best portrays "${mainEntity}"?`,
      options: [
        language === 'vi' ? `Nét tạo hình sinh động & thuộc tính đặc sắc (${entityAttr})` : `Vibrant character styling & attribute (${entityAttr})`,
        language === 'vi' ? 'Khung cảnh trống trơn không có chi tiết nào' : 'Plain empty background with no features',
        language === 'vi' ? 'Màu sắc bị nhạt nhòa, không nhìn rõ hình' : 'Faded colors with no focal character',
        language === 'vi' ? 'Bức tranh không liên quan đến đề bài của bé' : 'Completely unrelated to our classroom idea'
      ],
      correctIndex: 0,
      points: 10,
      explanation: language === 'vi'
        ? `Bé giỏi quá! Bức tranh đã bám sát ý tưởng sáng tạo để vẽ nên "${mainEntity}" với những nét vẽ rất sinh động (${entityAttr})!`
        : `Awesome! The artwork faithfully rendered "${mainEntity}" with lively details (${entityAttr})!`,
      hint: language === 'vi' ? 'Bé hãy nhìn vào tâm điểm bức tranh xem nhân vật chính đang làm gì nhé!' : 'Observe the central subject in the artwork carefully!',
      stats: [85, 5, 6, 4]
    },
    {
      id: 'q2',
      question: language === 'vi'
        ? `Câu 2: Bảng màu và ánh sáng tươi vui của bức tranh mang lại cho các bạn nhỏ cảm xúc gì?`
        : `Question 2: What cheerful feeling does the artwork's color palette and lighting bring to the students?`,
      options: [
        language === 'vi' ? 'U ám, buồn bã và thiếu sức sống' : 'Gloomy and lifeless',
        language === 'vi' ? 'Ấm áp, rực rỡ, vui tươi và tràn đầy niềm vui khám phá' : 'Warm, radiant, joyful, and full of discovery',
        language === 'vi' ? 'Chỉ có hai màu đen trắng nhàm chán' : 'Boring flat black and white',
        language === 'vi' ? 'Bị chói lóa làm mất hết chi tiết' : 'Overly harsh light hiding details'
      ],
      correctIndex: 1,
      points: 10,
      explanation: language === 'vi'
        ? 'Chính xác 100%! Những gam màu tươi sáng, ấm áp giúp các bạn nhỏ cảm thấy tràn ngập niềm vui và yêu thích bức tranh hơn!'
        : '100% Correct! The bright, warm colors create a cheerful and engaging atmosphere for young learners!',
      hint: language === 'vi' ? 'Bé hãy cảm nhận xem màu sắc này giống như một ngày nắng ấm vui vẻ phải không nào?' : 'Feel the sunny warmth and vibrant cheer of the colors!',
      stats: [3, 91, 4, 2]
    },
    {
      id: 'q3',
      question: language === 'vi'
        ? `Câu 3: Người bạn công nghệ thông minh nào đã giúp chúng mình vẽ nên bức tranh tuyệt đẹp này từ ý tưởng "${promptSummary}"?`
        : `Question 3: Which smart AI companion generated this wonderful artwork for "${promptSummary}"?`,
      options: [
        `Mô hình Google AI thế hệ mới (${selectedModel})`,
        'Bút sáp màu bị gãy',
        'Tờ giấy vẽ cũ thời xa xưa',
        'Một phần mềm máy tính lỗi thời'
      ],
      correctIndex: 0,
      points: 10,
      explanation: language === 'vi'
        ? `Hoàn toàn chính xác! Bức tranh do mô hình tiên tiến ${selectedModel} của Google AI phối hợp cùng ý tưởng của chúng mình tạo ra!`
        : `Spot on! Powered by Google AI's ${selectedModel} co-creating with your idea!`,
      hint: language === 'vi' ? 'Bé nhìn lên thanh công cụ sẽ thấy tên mô hình AI thông minh của chúng mình nhé!' : 'Check the model badge shown in the top toolbar!',
      stats: [95, 2, 2, 1]
    },
    {
      id: 'q4',
      question: language === 'vi'
        ? `Câu 4: Quá trình "Cùng sáng tạo chủ động" (trả lời câu hỏi làm rõ) đã giúp gì cho bức tranh của lớp chúng mình?`
        : `Question 4: How did the interactive questions help make our classroom picture much better?`,
      options: [
        language === 'vi' ? 'Làm tranh bị vẽ sai ý muốn của bé' : 'Caused errors in the drawing',
        language === 'vi' ? 'Tự xóa hết các chi tiết đẹp đẽ' : 'Deleted the beautiful details',
        language === 'vi' ? 'Giúp AI hiểu đúng suy nghĩ của bé, vẽ đúng nhân vật, màu sắc và bối cảnh như bé mong muốn' : 'Helped AI understand the creative idea, rendering the subject and colors as envisioned',
        language === 'vi' ? 'Không có tác dụng gì cả' : 'Made no difference at all'
      ],
      correctIndex: 2,
      points: 10,
      explanation: language === 'vi'
        ? 'Tuyệt vời! Nhờ việc bé trả lời câu hỏi và cùng suy nghĩ với AI, bức tranh đã được vẽ nên đúng chuẩn ý tưởng của bé!'
        : 'Superb! Co-creating with interactive questions aligned the AI with your exact creative vision!',
      hint: language === 'vi' ? 'Nhớ lại lúc chúng mình chọn màu sắc, phong cách và nhân vật trước khi AI vẽ nhé!' : 'Recall the step where you chose styles and characters before generating!',
      stats: [2, 3, 93, 2]
    }
  ];
};
