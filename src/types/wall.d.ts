

export interface WallCategory {
 id: number;
 name: string;
 mark: string;
 order: number;
}

export interface Wall {
 id: number;
 createTime: number;
 name: string;
 cateId: number;
 cate: WallCategory;
 color: string;
 content: string;
 email: string | null;
 status: number;
 isChoice: number;
}
