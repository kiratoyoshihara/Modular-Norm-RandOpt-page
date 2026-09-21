# Modular Norm RandOpt

Research project page for **Modular Norm RandOpt: Population-Efficient Ensembling through Architecture-Aware Perturbations**.

## ローカルで見る

このディレクトリで実行します。サイトの閲覧にNode.jsやnpm installは不要です。

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

[http://127.0.0.1:8000/](http://127.0.0.1:8000/) を開きます。停止はサーバーを実行しているターミナルで `Ctrl+C`。

## 現在の内容

- Neural ThicketsのScalingセクションを参考にした真っ白（`#ffffff`）の背景・黒文字・グレーの罫線。見出しは小さめの左揃えに統一する。
- OverviewにRandOptの短い紹介と、Modular Norm RandOptの手法アニメーションを掲載する。濃淡のある青系の行列で重み、暖色系の行列で摂動を表し、長い矢印で候補群・選別・投票へつなぐ。Gaussianノイズの生成→モジュールごとの整形→N候補の生成→Top-K選別→投票の順に自動再生し、Pause／Play・Replay・工程選択に対応する。PCは横方向、小画面は縦方向の一体型の図とし、JavaScriptなしでは完成した図を表示する。RandOptのリンク先は `https://thickets.mit.edu/` で、同じタブで開く。
- Table 1(a)の7タスク・3手法・3モデルサイズを比較するSVGレーダー。全タスク・モデルで共通の0–100%尺度を使用し、点線や系列に触れると20・40・60・80・100の目盛りを表示する。平均・標本SD・差分はホバー／タップ／キーボード操作で確認できる。タスク名の下にはMath・Chemistry・Programming・Writingを表示する。数値表は表示しない。
- 提案手法は青、RandOptはオレンジ、RMSNorm-onlyは紫。輪郭や凡例に触れると同色で面を強調する。初めてスクロールで表示した時に点→線→面の順で現れ、Replayで選択中のモデルを再生できる。スコアを確認する操作や動きを減らす設定では完成した図をすぐに表示する。図全体のブラウザ標準ホバー説明と、ツールチップのShared axis行は表示しない。
- Figure 2を論文と同じ2行×2列で再描画。上段Countdown、下段GSM8K、左列K=10、右列K=25。表示した行から軸→点→線・帯→比較マーカー・注釈の順に現れる。カーソル追従線は付けない。再生ボタン、画面外・非表示時の停止、動きを減らす設定に対応する。
- 「Comparison with iterative baselines」はCountdown／GSM8Kの2パネルで、横軸N・縦軸精度を比較する。MN-RandOptは各タスクでN=100・K=25、N=3,000・K=25、N=3,000・K=1の3条件に絞り、星印で表示する。MeZO・RandOpt・ES-at-Scale・ZO-Finetunerと合わせて14点を示し、接続線とSDバーは表示しない。SDはツールチップで確認できる。N=100とES-at-ScaleのN=3,000を比較し、30倍のNの差と平均精度差（+2.73／+0.05ポイント）を示す。軸→N=3,000の点→N=100の点と注記の順に現れ、Replayで再生できる。
- 構成はタイトル、独立したOverview、Figure 2、Across tasks & scales、反復手法との比較。左側目次もこの順序にそろえる。Overviewには研究の要点・RandOptの紹介・新しい手法図を置く。以前の詳細なMethodセクションは非掲載とする。著者・所属と冒頭のリンクボタンを維持する。ページ上部のOverview・Across tasks & scales・Paperのナビゲーションは削除した。末尾の論文案内・クレジット・仮公開の説明、レーダー下の操作ガイド・結果要約は削除した。以前の候補数比較UI・実行時間・モデル系列の比較表・支持分布の説明と投票デモも表示しない。
- スマートフォン用の図の配置と、JavaScript無効時の静止図・凡例。
- 図の上にあった番号付き小見出し「02 Population scaling」「03 Iterative baselines」「04 Across tasks & scales」は削除した。

HTML・CSS・JavaScript・SVG・JSONのみで構成しています。CDNや実行時の外部リクエスト、ライブラリ依存はありません。InterとJetBrains Monoを `assets/fonts/` から配信し、両方のSIL Open Font Licenseを同梱しています。

## データと図を更新する

レーダーの数値の正は `assets/data/transfer-results.json` です。データを変更したら、Node.jsで静止SVGと凡例も更新します。

```sh
node scripts/build-assets.mjs
```

掲載中の図をまとめて更新する場合は `npm run assets` を実行します。`assets/data/population-comparison.json` は以前の主要数値の根拠として保管しています。

Overviewの手法図は `assets/js/method-svg.js` が描画し、`method-animation.js` と `assets/css/method-animation.css` が動きを制御します。`node scripts/build-method.mjs` または `npm run assets` で再生成できます。説明は論文Section 3／Algorithm 1と照合し、提供スクリーンショット14.00.06の長い矢印と14.01.51の行列ブロックを参考に独自のSVGを作成しています。[Iterative RandOptの記事](https://thickets.mit.edu/blogs/iter_randopt.html)は動きの参考とし、RandOptの紹介リンクは元プロジェクトのトップページです。最初の候補はGaussianノイズZ₁の生成から示し、ランダムなセルの出現が終わってから1.1秒待って送信します。Scale工程ではZ₁と同じ濃淡の行列を受け取り、約0.45秒保ってから2.2秒かけてΔθ₁の強度を調整します。調整中は行列が柔らかく発光し、「Normalize + scale」の文字がオレンジで強調されます。以降は生成・正規化を繰り返さず、通常速度のパラメータ送信を約0.83秒間隔で9回行います。送信開始に合わせてZ・Δθ・θ′の添字を1〜9に切り替え、ZとΔθの各セルの色も対応する候補の模様へ更新します。最初の生成・正規化だけを詳しく再生し、以後は配色と添字を同時に切り替えます。各候補には対応する4×4の紫色のタイル模様を使い、約0.63秒の移動後に3×3の配置へ1個ずつ追加します。9個目の出現が完了してから0.95秒（従来より0.5秒長く）待って選別へ進みます。全体は約21.5秒です。各工程は開始時に表示し、Pause／Play・Replay・工程ボタン、画面外での一時停止、動きを減らす設定に対応します。投票は選ばれた3モデルの到着に合わせて1票ずつ示し、全票がそろってから結果を表示します。行列の濃淡・9候補・3モデル・回答A/A/Bは模式例です。

以前の詳細なMethodセクションは非掲載です。再掲載できるように `scripts/method-section.html`、関連する描画・操作コードとデータは保持しています。旧コードは実行時に初期化せず、通常の素材生成の対象からも外しています。`build-illustrations.mjs` は旧Methodのマーカーがない場合、そのまま終了します。

Figure 2の入力は、提供された `../figure2.md` 第6節を転記した `assets/data/figure2.csv` です。整数のseed別正答数から40点の平均と標本SDを再計算します。Countdown・MN・N=100・K=25のSDはこの実験の `3.22` であり、アブレーションの `0.87` を流用しません。再生成は `node scripts/build-figure2.mjs` または `npm run assets`。生成する静止版は `assets/figures/figure2.svg`、描画は `figure2-svg.js`、動きは `figure2-chart.js` / `figure2.css` にあります。狭い画面でも2×2の配置を保ち、図の領域だけ横スクロールできます。

## 確認

反復手法の入力は `assets/data/iterative-baselines.json`。2026-09-21にユーザーが提供した比較表を優先し、MN-RandOptは各タスクで指定された3条件に絞っています。横軸NはRandOpt系列では候補数、反復手法では摂動数を表し、計算時間や総評価回数には換算しません。Countdownの評価は1,500問でFigure 2の500問とは異なるため、両者の数値を混ぜません。`node scripts/build-iterative.mjs` はページの図と2つの静止SVGを更新します。

```sh
node scripts/check.mjs
```

63組の値、共通0–100%尺度、欠測値、静止図・凡例との一致、JavaScriptの構文を確認します。隣のディレクトリに提供済みの `main (1).tex` がある場合は、全数値をその表と照合します。

操作処理の検証には、公開対象外の `.local/verification/` にjsdomを入れて実行できます。

```sh
npm install --prefix .local/verification --no-save --package-lock=false --ignore-scripts jsdom
node scripts/check-ui.mjs
node scripts/check-motion.mjs
node scripts/check-figure2.mjs
node scripts/check-iterative.mjs
node scripts/check-method.mjs
```

これはDOM上の動作確認です。レーダーの強調・ツールチップ・モデル切り替え・初回表示を検証します。`check-motion.mjs` は実際のページ初期化を通して、Overviewの手法図と既存の比較図が互いに独立して動作すること、非表示タブでの停止、動きを減らす設定への対応を確認します。実ブラウザでのレイアウト・操作感の確認とは区別します。

`check-method.mjs` は9候補から3モデルを選ぶ模式図、手動操作、自動再生の工程順、一時停止・画面外・非表示タブでの経過時間保持、Replay、動きを減らす設定を確認します。

`check-figure2.mjs` は120個のseed別正答数、40点の平均・SD・帯、候補数のカテゴリ軸、比較差、4パネルの配置、表示開始・再生・停止を確認します。隣の `figure2.md` があれば、転記したCSVとの一致も検証します。

`check-iterative.mjs` は選択した14点と提供表の照合、接続線・SDバーの非表示、Nの線形軸、比較注記の数値、未報告値の除外、セクション順序、SVG、ホバー・タップ・キーボード・凡例・再生を確認します。

書体の配布元： [Inter](https://github.com/rsms/inter) ／ [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono)。イラストは独自のSVG／HTMLで、論文Figureの画像は使用していません。

## 公開前に確定する内容

- 著者、著者順、所属、プロフィール、コードURL、正式な論文URL、BibTeX。
- `assets/papers/paper-draft.pdf` は提供PDFのローカル確認用コピーで、Git管理から除外しています。公開前に正式なPDF・リンクへ置き換えます。
- ローカル版には `noindex, nofollow` を設定しています。公開準備時に見直します。
- PC・スマートフォンの実画面を確認し、GitHub Pagesの設定を行います。

**pushはユーザーの最終指示まで行いません。** 詳細は [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) を参照してください。
