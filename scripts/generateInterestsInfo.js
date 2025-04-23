import fs from 'fs';
import path from 'path';

const staticDir = path.join(process.cwd(), 'static');
const outputFile = path.join(process.cwd(), 'src/lib/interestsInfo.json');

function generateImageImports() {
  const interestsPath = path.join(staticDir, 'interests_images');
  const categories = fs.readdirSync(interestsPath);
  
  const imports = {};
  
  categories.forEach(category => {
    const categoryPath = path.join(interestsPath, category);
    if (category == ".DS_Store") { // darn you ds store
      return
    }
    const files = fs.readdirSync(categoryPath)
      .filter(file => ['.jpeg', '.jpg', '.png', '.gif', '.JPG'].some(ext => file.endsWith(ext)));
    
    imports[category] = {
      "media": files.map(file => 
      `/interests_images/${category}/${file}`
    ), 
      "index": 0
    }
  });

  const fileContent = `${JSON.stringify(imports, null, 2)}`;

  fs.writeFileSync(outputFile, fileContent);
  console.log('interests file paths generated');
}

generateImageImports();