import "dotenv/config";
import dbConnect from "../src/lib/mongoose.js";
import Program from "../src/models/Program.js";
import Skill from "../src/models/Skill.js";
import PublicCourse from "../src/models/PublicCourse.js";
import OnlineCourse from "../src/models/OnlineCourse.js";

async function run() {
  await dbConnect();

  // 1) Skills
  const skills = await Skill.insertMany(
    [
      {
        skill_id: "DATA",
        skill_name: "Data",
        skilliconurl: "",
        skillcolor: "#0ea5e9",
        skill_teaser: "Data analytics & foundations",
      },
      {
        skill_id: "POWERPLAT",
        skill_name: "Power Platform",
        skilliconurl: "",
        skillcolor: "#8b5cf6",
        skill_teaser: "Power BI / Automate / Apps",
      },
    ],
    { ordered: false }
  ).catch(() => null);

  const skillMap = Object.fromEntries(
    (await Skill.find({ skill_id: { $in: ["DATA", "POWERPLAT"] } })).map((s) => [s.skill_id, s._id])
  );

  // 2) Programs
  const programs = await Program.insertMany(
    [
      {
        program_id: "EXCEL",
        program_name: "Microsoft Excel",
        programcolor: "#22c55e",
        program_teaser: "Excel learning path from beginner to expert",
      },
      {
        program_id: "PBI",
        program_name: "Power BI",
        programcolor: "#f59e0b",
        program_teaser: "Business intelligence with Power BI",
      },
      {
        program_id: "SQLSERVER",
        program_name: "SQL Server",
        programcolor: "#ef4444",
        program_teaser: "Relational database & T-SQL",
      },
    ],
    { ordered: false }
  ).catch(() => null);

  const programMap = Object.fromEntries(
    (await Program.find({ program_id: { $in: ["EXCEL", "PBI", "SQLSERVER"] } })).map((p) => [p.program_id, p._id])
  );

  // 3) Public course (Excel Intermediate)
  await PublicCourse.create({
    course_id: "MSE-L1",
    course_name: "Microsoft Excel Intermediate",
    course_teaser:
      "เรียนรู้การใช้งาน Microsoft Excel ระดับกลาง เพิ่มทักษะสูตรคำนวณ จัดการข้อมูล และสร้างกราฟ",
    course_trainingdays: 2,
    course_traininghours: 12,
    course_price: 7900,
    course_netprice: null,
    course_cover_url: "",
    course_type_public: true,
    course_type_inhouse: true,
    course_levels: "Intermediate",
    course_workshop_status: true,
    course_certificate_status: true,
    course_promote_status: true,
    course_objectives: [
      "บอกประโยชน์ของ Microsoft Excel",
      "สร้าง/แก้ไขตารางเอกสาร",
      "ใช้สูตรคำนวณและสรุปผล",
      "ทำงานกับข้อมูล (Sort/Filter)",
      "สร้างกราฟแท่ง/วงกลม/เส้น",
    ],
    course_target_audience: [
      "ผู้ใช้งานทั่วไป",
      "ผู้ที่ต้องการเริ่มต้นอย่างเป็นระบบ",
    ],
    course_prerequisites: [
      "มีพื้นฐาน Windows และใช้งานอินเทอร์เน็ต",
    ],
    course_system_requirements: [
      "Windows 10/11",
      "Microsoft 365 (Excel)",
    ],
    course_training_topics: [
      "รู้จัก Excel และหลัก BI เบื้องต้น",
      "แหล่งข้อมูลและการนำเข้า",
    ],
    program: programMap["EXCEL"],
    skills: [skillMap["DATA"]], // Excel ก็ยังแตะทักษะ Data
  });

  // 4) Online course (Power BI Analytics)
  await OnlineCourse.create({
    o_course_id: "PBI-ANL-101",
    o_course_name: "Power BI Analytics Fundamentals",
    o_course_teaser:
      "เข้าใจภาพรวม Power BI, นำเข้าข้อมูล, สร้าง Visualization และเผยแพร่",
    o_number_lessons: 18,
    o_traininghours: 10,
    o_course_price: 1000,
    o_course_netprice: 800,
    o_course_cover_url: "",
    o_course_levels: "Beginner",
    o_workshop_status: true,
    o_certificate_status: true,
    o_coursepromote_status: true,
    o_course_objectives: [
      "เข้าใจภาพรวม Power BI",
      "สร้างรายงานและแดชบอร์ด",
    ],
    o_course_target_audience: ["ผู้เริ่มต้นด้าน Data/BI"],
    o_course_prerequisites: ["พื้นฐาน Excel"],
    o_course_system_requirements: ["Power BI Desktop", "Windows 10/11"],
    o_course_training_topics: [
      "Data Sources",
      "Modeling",
      "Visualization",
      "Publish to Service",
    ],
    program: programMap["PBI"],
    skills: [skillMap["DATA"], skillMap["POWERPLAT"]],
  });

  console.log("Seed completed");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
